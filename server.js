const express = require("express");
const multer = require("multer");
const dotenv = require("dotenv");
const axios = require("axios");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const HF_API_KEY = process.env.HF_API_KEY;
const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const EMOJI_MAP = {
  verySatisfied: ["😋", "🤤"],
  satisfied: ["😊", "👍"],
  love: ["💖", "💝"],
  sad: ["😢", "😔"],
  angry: ["😠", "😤"],
  neutral: ["😐", "🙂"],
  good: ["👌", "✨"],
  sorry: ["🙏", "😅"],
};

const getContextEmoji = (context, rating) => {
  switch (context) {
    case "taste":
      return rating >= 4
        ? EMOJI_MAP.verySatisfied[Math.floor(Math.random() * 2)]
        : rating <= 2
        ? EMOJI_MAP.sad[Math.floor(Math.random() * 2)]
        : EMOJI_MAP.neutral[Math.floor(Math.random() * 2)];
    case "delivery":
      return rating >= 4
        ? EMOJI_MAP.satisfied[Math.floor(Math.random() * 2)]
        : rating <= 2
        ? EMOJI_MAP.angry[Math.floor(Math.random() * 2)]
        : EMOJI_MAP.neutral[Math.floor(Math.random() * 2)];
    case "ending":
      return rating >= 4
        ? EMOJI_MAP.love[Math.floor(Math.random() * 2)]
        : rating <= 2
        ? EMOJI_MAP.sorry[Math.floor(Math.random() * 2)]
        : EMOJI_MAP.good[Math.floor(Math.random() * 2)];
    default:
      return EMOJI_MAP.neutral[Math.floor(Math.random() * 2)];
  }
};

async function retryWithBackoff(fn, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401) throw new Error("API 키가 유효하지 않습니다.");
        if (status === 429 || status === 503) {
          const waitTime = Math.pow(2, i) * 2000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          console.log(
            `모델 로딩 중 또는 Rate limit 도달. ${waitTime}ms 후 재시도...`
          );
          continue;
        }
      }

      if (i === maxRetries - 1) throw error;
      const waitTime = Math.pow(2, i) * 1500;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      console.log(`재시도 ${i + 1}/${maxRetries} (${waitTime}ms 대기)`);
    }
  }
}

async function analyzeImage(imageBuffer) {
  try {
    const response = await retryWithBackoff(async () => {
      return await axios.post(
        "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large",
        imageBuffer,
        {
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/octet-stream",
          },
          timeout: 60000,
        }
      );
    });

    return response.data[0]?.generated_text || "";
  } catch (error) {
    console.error("이미지 분석 오류:", error);
    return "";
  }
}

const generateReview = async (prompt) => {
  try {
    const response = await retryWithBackoff(async () => {
      console.log("Sending prompt to API...");

      const ratings = {
        delivery: Number(prompt.ratings.delivery),
        taste: Number(prompt.ratings.taste),
        quantity: Number(prompt.ratings.quantity),
        price: Number(prompt.ratings.price),
      };

      const menuItems = prompt.foodName.split(",").map((item) => item.trim());
      const menuText =
        menuItems.length > 1
          ? `${menuItems.slice(0, -1).join(", ")}랑 ${
              menuItems[menuItems.length - 1]
            }`
          : menuItems[0];

      const modelPrompt = `아래 조건에 맞는 음식 리뷰를 작성해주세요.
  
  주문 정보:
  - 메뉴: ${menuText}
  - 이미지 설명: ${prompt.imageDesc || ""}
  - 배달 평점: ${ratings.delivery}점
  - 맛 평점: ${ratings.taste}점
  - 양 평점: ${ratings.quantity}점
  - 가격 평점: ${ratings.price}점
  
  작성 규칙:
  1. 실제 손님이 작성한 것처럼 자연스럽게 작성
  2. 각 평점을 반영하여 솔직한 피드백 제공
  3. 존댓말 사용
  4. 200-300자 정도로 작성
  5. 이모티콘이나 특수문자 사용하지 않기
  6. 형식적인 표현 ("음식점", "오늘", "새로운" 등) 사용하지 않기
  
  평가 포인트:
  ${
    ratings.delivery <= 2
      ? "- 배달이 많이 늦어서 아쉬웠던 점을 언급"
      : ratings.delivery >= 4
      ? "- 배달이 빨랐던 점을 칭찬"
      : "- 배달 시간이 적당했다고 언급"
  }
  ${
    ratings.taste <= 2
      ? "- 맛이 기대에 미치지 못했던 점을 예의 있게 표현"
      : ratings.taste >= 4
      ? "- 맛이 매우 훌륭했던 점을 구체적으로 표현"
      : "- 맛이 평범했다고 표현"
  }
  ${
    ratings.quantity <= 2
      ? "- 양이 부족했던 점을 언급"
      : ratings.quantity >= 4
      ? "- 양이 넉넉했던 점을 칭찬"
      : "- 양이 적당했다고 표현"
  }
  ${
    ratings.price <= 2
      ? "- 가격이 비싸서 아쉬웠던 점을 언급"
      : ratings.price >= 4
      ? "- 가격이 합리적이어서 좋았던 점을 칭찬"
      : "- 가격이 적당했다고 표현"
  }
  
  리뷰를 작성해주세요:`;

      const modelResponse = await axios.post(
        "https://api-inference.huggingface.co/models/MLP-KTLim/llama-3-Korean-Bllossom-8B",
        {
          inputs: modelPrompt,
          parameters: {
            max_new_tokens: 512,
            temperature: 0.7,
            top_p: 0.85,
            repetition_penalty: 1.2,
            return_full_text: false,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      console.log(
        "Model Response:",
        JSON.stringify(modelResponse.data, null, 2)
      );

      let generatedText = modelResponse.data[0]?.generated_text || "";

      const addEmojis = (text, ratings) => {
        const averageRating =
          Object.values(ratings).reduce((a, b) => a + b) / 4;
        const segments = text.split(/[.!?]\s+/);

        if (segments.length > 0) {
          segments[0] = `${segments[0]} ${getContextEmoji(
            "delivery",
            ratings.delivery
          )}`;
        }

        if (segments.length > 1) {
          const midIndex = Math.floor(segments.length / 2);
          segments[midIndex] = `${segments[midIndex]} ${getContextEmoji(
            "taste",
            ratings.taste
          )}`;
        }

        if (segments.length > 0) {
          segments[segments.length - 1] = `${
            segments[segments.length - 1]
          } ${getContextEmoji("ending", averageRating)}`;
        }

        return segments.join(". ");
      };

      generatedText = addEmojis(generatedText, ratings);

      return {
        data: [
          {
            generated_text: generatedText,
          },
        ],
      };
    });

    let generatedText = response?.data[0]?.generated_text || "";

    const postProcess = (text) => {
      return text
        .replace(
          /[^\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F가-힣ㄱ-ㅎㅏ-ㅣ0-9\s.,!?~😊😋🤤👍💖😢😔😠😤😐🙂👌✨🙏😅]/g,
          ""
        )
        .replace(/\s+/g, " ")
        .replace(/\.+/g, ".")
        .replace(/([😊😋🤤👍💖😢😔😠😤😐🙂👌✨🙏😅])\1+/g, "$1")
        .replace(/\s+(그리고|그래서|그런데)\s+/g, " ")
        .replace(/\s+\./g, ".")
        .replace(/['"]/g, "")
        .replace(/\s+([😊😋🤤👍💖😢😔😠😤😐🙂👌✨🙏😅])/g, " $1")
        .replace(/([😊😋🤤👍💖😢😔😠😤😐🙂👌✨🙏😅])\s+/g, "$1 ")
        .trim();
    };

    return postProcess(generatedText);
  } catch (error) {
    console.error("Review generation error:", error);

    const ratings = prompt.ratings;
    const basicReview =
      `${prompt.foodName} 주문했어요. ` +
      `${
        Number(ratings.delivery) <= 2
          ? "배달이 많이 늦어서 아쉬웠지만"
          : "배달 시간은 괜찮았고"
      } ` +
      `${
        Number(ratings.taste) >= 4 ? "맛은 정말 좋았어요" : "맛은 평범했어요"
      }. ` +
      `${Number(ratings.quantity) >= 4 ? "양도 넉넉했고" : "양은 적당했고"} ` +
      `${
        Number(ratings.price) <= 2
          ? "가격이 조금 있네요."
          : "가격은 보통이에요."
      } ` +
      `${
        (Number(ratings.taste) + Number(ratings.price)) / 2 >= 3
          ? "다음에 또 시켜먹고 싶어요!"
          : "조금 아쉽네요."
      }`;

    return `${basicReview} ${getContextEmoji("ending", 3)}`;
  }
};

app.use((req, res, next) => {
  const startTime = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    console.log(`${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

app.post("/review", upload.single("image"), async (req, res) => {
  try {
    console.log("Received review request:", req.body);

    const {
      foodName,
      deliveryRating,
      tasteRating,
      quantityRating,
      priceRating,
    } = req.body;
    const image = req.file?.buffer;

    if (
      !foodName ||
      !deliveryRating ||
      !tasteRating ||
      !quantityRating ||
      !priceRating
    ) {
      return res.status(400).json({
        error: "필수 입력값이 누락되었습니다.",
        received: {
          foodName,
          deliveryRating,
          tasteRating,
          quantityRating,
          priceRating,
        },
      });
    }

    let imageDesc = "";
    if (image) {
      try {
        const compressedImage = await sharp(image)
          .resize({ width: 512, height: 512, fit: "inside" })
          .jpeg({ quality: 80 })
          .toBuffer();

        imageDesc = await analyzeImage(compressedImage);
        console.log("Image analysis complete:", imageDesc);
      } catch (error) {
        console.error("Image processing error:", error);
      }
    }

    const promptData = {
      foodName,
      imageDesc,
      ratings: {
        delivery: deliveryRating,
        taste: tasteRating,
        quantity: quantityRating,
        price: priceRating,
      },
    };

    const review = await generateReview(promptData);

    res.json({
      review,
      success: true,
    });
  } catch (error) {
    console.error("Review generation failed:", error);
    res.status(500).json({
      error: "리뷰 생성 중 오류가 발생했습니다.",
      details: error.message,
      success: false,
    });
  }
});

app.use("/uploads", express.static(uploadDir));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`서버가 ${port}번 포트에서 실행 중입니다.`);
});
