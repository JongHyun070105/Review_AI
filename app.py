from fastapi import FastAPI, UploadFile, Form, File
from fastapi.responses import JSONResponse
from transformers import Qwen2VLForConditionalGeneration, AutoProcessor
from qwen_vl_utils import process_vision_info
import base64
import io
import torch
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model and processor
model = Qwen2VLForConditionalGeneration.from_pretrained(
    "Qwen/Qwen2-VL-2B-Instruct", torch_dtype="auto", device_map="cpu"
)
processor = AutoProcessor.from_pretrained("Qwen/Qwen2-VL-2B-Instruct")

def remove_redundancy(text):
    words = text.split()
    seen = set()
    filtered_words = []
    for word in words:
        if word not in seen:
            seen.add(word)
            filtered_words.append(word)
    return ' '.join(filtered_words)

@app.post("/generate-review/")
async def generate_review(
    food_name: str = Form(...),
    delivery: int = Form(...),
    taste: int = Form(...),
    quantity: int = Form(...),
    price: int = Form(...),
    image: UploadFile = File(...) 
):
    try:
        print(f"Received food_name: {food_name}")
        print(f"Received ratings: delivery={delivery}, taste={taste}, quantity={quantity}, price={price}")
        
        if image:
            print("Image received.")
        else:
            print("No image received.")

        # Save the uploaded image
        image_bytes = await image.read()
        
        # Resize the image
        image = Image.open(io.BytesIO(image_bytes))
        image = image.resize((256, 256))  # Resize to 256x256
        buffered = io.BytesIO()
        image.save(buffered, format="JPEG")
        image_bytes = buffered.getvalue()
        
        image_uri = f"data:image/jpeg;base64,{base64.b64encode(image_bytes).decode()}"

        # Prepare the messages for the model
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": image_uri},
                    {"type": "text", "text": f'''
                     당신은 평범한 배달 음식 소비자입니다. 
                     이 음식 이미지를 보고 {food_name}에 대해 알맞고 긍정적인 리뷰 멘트를 작성해주세요.
                     유쾌하거나 감동적인 톤으로 150자 이내로 써주세요.'''}
                ]
            }
        ]

        # Process the input for the model
        text = processor.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        image_inputs, video_inputs = process_vision_info(messages)
        inputs = processor(
            text=[text],
            images=image_inputs,
            videos=video_inputs,
            padding=True,
            return_tensors="pt",
        )
        inputs = inputs.to("cpu")

        max_attempts = 5
        attempts = 0
        output_review = None

        while attempts < max_attempts:
            # Inference
            generated_ids = model.generate(**inputs, max_new_tokens=128, temperature=0.7)
            generated_ids_trimmed = [
                out_ids[len(in_ids):] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
            ]
            output_text = processor.batch_decode(
                generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
            )

            # 체크하여 음식 단어 포함 여부 확인
            if food_name in output_text[0]:
                output_review = output_text[0]
                break

            attempts += 1

        if output_review:
            # 후처리: 중복 표현 제거
            output_review = remove_redundancy(output_review)
            return JSONResponse(content={"review": output_review})
        else:
            return JSONResponse(content={"review": "음식에 대한 리뷰를 생성할 수 없습니다."})

    except Exception as e:
        print("Error:", str(e))
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
