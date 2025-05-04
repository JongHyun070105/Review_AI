# 📱 Review AI

<div align="center">
  <img src="https://img.shields.io/badge/React Native-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white" />
  <img src="https://img.shields.io/badge/TensorFlow-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white" />
</div>

## 📋 프로젝트 소개
Review AI는 사용자가 업로드한 이미지를 분석하여 AI가 자동으로 리뷰를 생성해주는 모바일 애플리케이션입니다. TensorFlow.js와 ONNX Runtime을 활용하여 이미지 분석을 수행하며, 생성된 리뷰는 클립보드에 복사하여 쉽게 공유할 수 있습니다.

## ✨ 주요 기능
### 📸 이미지 업로드
- 갤러리에서 이미지 선택
- 카메라로 직접 촬영
- 이미지 전처리 및 최적화

### 🤖 AI 리뷰 생성
- TensorFlow.js를 활용한 이미지 분석
- ONNX Runtime으로 모델 추론
- Hugging Face API 통합

### 📋 리뷰 관리
- 생성된 리뷰 확인
- 클립보드에 복사 기능
- 리뷰 공유 기능

## 🛠️ 기술 스택
- **프론트엔드**: React Native, Expo
- **AI/ML**: TensorFlow.js, ONNX Runtime
- **백엔드**: Express.js
- **이미지 처리**: Sharp, Expo Image Manipulator
- **상태 관리**: React Navigation

## 🔑 API 키 설정
프로젝트를 실행하기 위해서는 다음 API 키들이 필요합니다:

1. **Hugging Face API 키**
   - [Hugging Face](https://huggingface.co/)에서 계정을 생성하고 API 키를 발급받습니다.
   - 이미지 분석을 위한 모델에 접근하기 위해 필요합니다.

2. **ngrok 인증 토큰**
   - [ngrok](https://ngrok.com/)에서 계정을 생성하고 인증 토큰을 발급받습니다.
   - 로컬 서버를 외부에서 접근 가능하게 하기 위해 필요합니다.

`.env` 파일에 다음과 같이 API 키들을 설정합니다:
```env
HUGGING_FACE_API_KEY=your_hugging_face_api_key
NGROK_AUTH_TOKEN=your_ngrok_auth_token
```

## 📱 시스템 요구사항
- Node.js 14.0.0 이상
- Expo CLI
- iOS 13.0 이상 또는 Android 5.0 이상

## 🔧 설치 방법
1. 프로젝트를 클론합니다:
```bash
git clone https://github.com/JongHyun070105/Review_AI.git
```

2. 의존성을 설치합니다:
```bash
npm install
```

3. 환경 변수 설정:
```bash
cp .env.example .env
# .env 파일에 필요한 API 키들을 설정합니다.
```

4. 앱을 실행합니다:
```bash
npm start
```

## 📖 사용 방법
1. 앱을 실행합니다.
2. 'Upload' 화면에서 이미지를 선택하거나 촬영합니다.
3. AI가 이미지를 분석하고 리뷰를 생성합니다.
4. 'Review' 화면에서 생성된 리뷰를 확인하고 복사할 수 있습니다.

## 📁 프로젝트 구조
```
review-ai/
├── App.js              # 앱의 메인 컴포넌트
├── Upload.js           # 이미지 업로드 화면
├── Review.js           # 리뷰 확인 화면
├── Font.js             # 폰트 설정
├── server.js           # 백엔드 서버
├── assets/             # 이미지 및 폰트 리소스
└── package.json        # 프로젝트 의존성
```

## 📄 라이센스
이 프로젝트는 MIT 라이센스를 따릅니다. 
