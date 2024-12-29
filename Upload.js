import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  Image,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { FontAwesome } from "@expo/vector-icons";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import useCustomFonts from "./Font";

const { width, height } = Dimensions.get("window");

export default function Upload() {
  const [imageUri, setImageUri] = useState(null);
  const [foodName, setFoodName] = useState("");
  const [deliveryRating, setDeliveryRating] = useState(null);
  const [tasteRating, setTasteRating] = useState(null);
  const [quantityRating, setQuantityRating] = useState(null);
  const [priceRating, setPriceRating] = useState(null);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);

  const fontsLoaded = useCustomFonts();
  const navigation = useNavigation();

  const handleImageUpload = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();

    if (
      permissionResult.granted === false ||
      cameraPermission.granted === false
    ) {
      Alert.alert("권한이 필요합니다. 설정에서 권한을 부여해주세요.");
      return;
    }

    Alert.alert(
      "이미지 선택",
      "갤러리에서 선택하거나 카메라로 촬영할 수 있습니다.",
      [
        { text: "카메라 촬영", onPress: () => launchCamera() },
        { text: "갤러리에서 선택", onPress: () => launchImageLibrary() },
        { text: "취소", style: "cancel" },
      ]
    );
  };

  const launchCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (result.canceled) {
      Alert.alert("카메라 촬영이 취소되었습니다.");
    } else {
      setImageUri(result.assets[0].uri);
    }
  };

  const launchImageLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaType: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (result.canceled) {
      Alert.alert("이미지 선택이 취소되었습니다.");
    } else {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleStarClick = (ratingType, rating) => {
    switch (ratingType) {
      case "delivery":
        setDeliveryRating(rating);
        break;
      case "taste":
        setTasteRating(rating);
        break;
      case "quantity":
        setQuantityRating(rating);
        break;
      case "price":
        setPriceRating(rating);
        break;
    }
  };

  const renderStars = (ratingType, rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => handleStarClick(ratingType, i)}
        >
          <FontAwesome
            name={i <= rating ? "star" : "star-o"}
            size={30}
            color={i <= rating ? "#FFD700" : "#BDBDBD"}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const handleSubmit = async () => {
    if (
      !imageUri ||
      !foodName ||
      !deliveryRating ||
      !tasteRating ||
      !quantityRating ||
      !priceRating
    ) {
      Alert.alert("모든 항목을 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      const uri = imageUri;

      const formData = new FormData();
      formData.append("image", {
        uri: uri,
        type: "image/jpeg",
        name: "image.jpg",
      });
      formData.append("foodName", foodName);
      formData.append("deliveryRating", deliveryRating);
      formData.append("tasteRating", tasteRating);
      formData.append("quantityRating", quantityRating);
      formData.append("priceRating", priceRating);

      const prompt = `
          메뉴: ${foodName}
          평가:
          - 배달: ${deliveryRating}점
          - 맛: ${tasteRating}점
          - 양: ${quantityRating}점
          - 가격: ${priceRating}점

          위 정보를 바탕으로 자연스럽고 진정성 있는 리뷰를 작성해주세요.`;

      formData.append("prompt", prompt);

      const response = await axios.post(
        "http://192.168.219.101:5000/review", // ipconfig로 ip 주소 가져오기
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const generatedReview = response.data.review;
      setReview(generatedReview);
      setLoading(false);

      navigation.navigate("Review", {
        review: generatedReview,
        foodName: foodName,
      });
    } catch (error) {
      setLoading(false);
      console.error("Error details:", error);
      Alert.alert(
        "리뷰 생성 실패",
        "서비스 연결에 실패했습니다. 잠시 후 다시 시도해주세요."
      );
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>리뷰 작성중...</Text>
        </View>
      )}

      <Text style={styles.title}>리뷰 AI</Text>
      <TouchableOpacity style={styles.uploadButton} onPress={handleImageUpload}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
        ) : (
          <FontAwesome name="camera" size={50} color="#BDBDBD" />
        )}
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        placeholder="음식명을 입력해주세요"
        value={foodName}
        onChangeText={setFoodName}
      />
      <View style={styles.starContainer}>
        <Text style={styles.starTitle}>배달</Text>
        {renderStars("delivery", deliveryRating)}
      </View>
      <View style={styles.starContainer}>
        <Text style={styles.starTitle}>맛</Text>
        {renderStars("taste", tasteRating)}
      </View>
      <View style={styles.starContainer}>
        <Text style={styles.starTitle}>양</Text>
        {renderStars("quantity", quantityRating)}
      </View>
      <View style={styles.starContainer}>
        <Text style={styles.starTitle}>가격</Text>
        {renderStars("price", priceRating)}
      </View>
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.buttonText}>리뷰 작성하기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    padding: width * 0.01,
    width: "100%",
    height: "100%",
    backgroundColor: "#fff",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  loadingText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20,
    fontFamily: "doyen",
  },
  title: {
    fontSize: height * 0.08,
    fontWeight: "bold",
    marginTop: height * 0.08,
    marginBottom: height * 0.04,
    fontFamily: "doyen",
  },
  input: {
    width: "90%",
    paddingVertical: height * 0.02,
    backgroundColor: "#F1F1F1",
    borderColor: "#BDBDBD",
    borderWidth: 1.5,
    borderRadius: 10,
    paddingLeft: 10,
    marginBottom: height * 0.02,
    fontFamily: "doyen",
  },
  starContainer: {
    flexDirection: "row",
    marginBottom: height * 0.02,
    width: "90%",
    justifyContent: "space-between",
    alignItems: "center",
  },
  starTitle: {
    fontSize: height * 0.025,
    textAlign: "left",
    marginRight: 10,
    flex: 1,
    fontFamily: "doyen",
  },
  submitButton: {
    backgroundColor: "#000",
    paddingVertical: height * 0.02,
    borderRadius: 10,
    width: "90%",
    alignItems: "center",
    marginTop: height * 0.01,
  },
  buttonText: {
    color: "#fff",
    fontSize: height * 0.02,
    fontFamily: "doyen",
  },
  uploadButton: {
    backgroundColor: "#F1F1F1",
    borderColor: "#BDBDBD",
    borderWidth: 2,
    height: height * 0.3,
    width: "90%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    marginBottom: height * 0.03,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    resizeMode: "cover",
  },
});
