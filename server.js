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

      const modelPrompt = `아래 주문 정보를 바탕으로 실제 음식 배달 리뷰를 작성해주세요.

주문 정보:
- 메뉴: ${menuText}
- 이미지 설명: ${prompt.imageDesc || ""}
- 배달 평점: ${ratings.delivery}점
- 맛 평점: ${ratings.taste}점
- 양 평점: ${ratings.quantity}점
- 가격 평점: ${ratings.price}점

상세 평가:
${
  ratings.delivery >= 4
    ? "배달이 빨랐고 음식 포장 상태도 좋았습니다."
    : ratings.delivery <= 2
    ? "배달이 예상보다 많이 지연되었고 기다리는 동안 불편했습니다."
    : "배달 시간은 평균적이었습니다."
}

${
  ratings.taste >= 4
    ? "음식의 맛이 기대 이상으로 좋았고, 재료의 신선도와 품질이 뛰어났습니다."
    : ratings.taste <= 2
    ? "음식의 맛이 기대에 미치지 못했고, 조리 상태가 아쉬웠습니다."
    : "음식의 맛은 평범한 수준이었습니다."
}

${
  ratings.quantity >= 4
    ? "양이 넉넉해서 푸짐하게 먹을 수 있었습니다."
    : ratings.quantity <= 2
    ? "양이 예상보다 적어서 아쉬웠습니다."
    : "양은 적당했습니다."
}

${
  ratings.price >= 4
    ? "가격 대비 만족도가 높았고 합리적인 가격이었습니다."
    : ratings.price <= 2
    ? "가격이 다소 비싸다고 느껴졌습니다."
    : "가격은 일반적인 수준이었습니다."
}

작성 규칙:
1. 실제 리뷰처럼 자연스럽고 개성 있게 작성
2. 존댓말 사용
3. 200-300자 내외로 작성
4. 메뉴명을 자연스럽게 포함
5. "오늘", "이 음식점", "새로운" 등 형식적인 표현 자제
6. 구체적인 맛 표현과 음식 특징 포함
7. 장단점을 균형있게 서술
8. 마지막에 재주문 의향이나 추천 여부 포함

리뷰를 작성해주세요:`;

      const modelResponse = await axios.post(
        "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1",
        {
          inputs: modelPrompt,
          parameters: {
            max_new_tokens: 512,
            temperature: 0.8,
            top_p: 0.9,
            repetition_penalty: 1.15,
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
    const getDeliveryComment = (rating) => {
      if (rating <= 2) return "배달이 많이 지연되어 아쉬웠지만";
      if (rating >= 4) return "배달이 빠르게 와서 좋았고";
      return "배달 시간은 적당했고";
    };

    const getTasteComment = (rating) => {
      if (rating <= 2) return "맛이 기대보다는 조금 떨어져서 아쉬웠어요";
      if (rating >= 4) return "맛있게 잘 먹었습니다";
      return "맛은 평범했어요";
    };

    const getQuantityComment = (rating) => {
      if (rating <= 2) return "양이 조금 부족한 느낌이었고";
      if (rating >= 4) return "양도 넉넉해서 좋았고";
      return "양은 적당했고";
    };

    const getPriceComment = (rating) => {
      if (rating <= 2) return "가격이 조금 있는 편이네요";
      if (rating >= 4) return "가격도 합리적이어서 만족스러웠어요";
      return "가격은 보통 수준이에요";
    };

    const getEndingComment = (tasteRating, priceRating) => {
      const avgRating = (Number(tasteRating) + Number(priceRating)) / 2;
      if (avgRating >= 3.5) return "다음에도 주문하고 싶네요";
      if (avgRating <= 2) return "개선이 필요해 보입니다";
      return "나쁘지 않은 선택이었습니다";
    };

    const basicReview = `${prompt.foodName} 주문했습니다. ${getDeliveryComment(
      ratings.delivery
    )} ${getTasteComment(ratings.taste)}. ${getQuantityComment(
      ratings.quantity
    )} ${getPriceComment(ratings.price)}. ${getEndingComment(
      ratings.taste,
      ratings.price
    )}`;

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
