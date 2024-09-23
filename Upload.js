import React, { useState, useEffect } from "react";
import {
  View,
  Alert,
  Image,
  StyleSheet,
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import Icon from "react-native-vector-icons/FontAwesome";

const Upload = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {
    imageUri = null,
    foodName = "",
    ratings = { delivery: 0, taste: 0, quantity: 0, price: 0 },
  } = route.params || {};

  const [image, setImage] = useState(imageUri);
  const [foodNameState, setFoodName] = useState(foodName);
  const [ratingsState, setRatings] = useState(ratings);
  const [loading, setLoading] = useState(false);

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("권한 요청", "이미지 선택을 위해 권한이 필요합니다.");
    }
  };

  useEffect(() => {
    requestPermission();
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      console.log("Selected Image URI:", result.assets[0].uri); // 선택된 이미지 URI 출력
      setImage(result.assets[0].uri);
    } else {
      Alert.alert("이미지 선택", "이미지가 선택되지 않았습니다.");
    }
  };

  const handleRating = (category, rating) => {
    // 평점 카테고리를 영어로 통일
    const categoryKey =
      category === "배달"
        ? "delivery"
        : category === "맛"
        ? "taste"
        : category === "양"
        ? "quantity"
        : "price";

    setRatings((prev) => ({ ...prev, [categoryKey]: rating }));
  };
  const submitReview = async () => {
    console.log("Food Name:", foodNameState);
    console.log("Image URI:", image);
    console.log("Ratings:", ratingsState);
    if (!foodNameState.trim()) {
      Alert.alert("입력 오류", "음식명을 입력해 주세요.");
      return;
    }

    if (!image) {
      Alert.alert("입력 오류", "이미지를 업로드해 주세요.");
      return;
    }

    if (Object.values(ratingsState).some((r) => r === 0)) {
      Alert.alert("입력 오류", "모든 평점을 매겨 주세요.");
      return;
    }

    setLoading(true);
    const review = await runModel(image);
    setLoading(false);

    navigation.navigate("Review", {
      review,
      foodName: foodNameState,
      imageUri: image,
      ratings: ratingsState,
    });
  };

  const runModel = async (imageUri) => {
    const formData = new FormData();
    formData.append("food_name", foodNameState);
    formData.append("delivery", ratingsState.delivery);
    formData.append("taste", ratingsState.taste);
    formData.append("quantity", ratingsState.quantity);
    formData.append("price", ratingsState.price);
    formData.append("image", {
      uri: imageUri,
      type: "image/jpeg",
      name: "image.jpg",
    });

    console.log("FormData prepared:", formData); // 추가된 로그

    try {
      const response = await fetch(
        "http://192.168.219.108:8000/generate-review/",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "알 수 없는 오류");
      }
      const data = await response.json();
      console.log("Response data:", data); // 추가된 로그
      return data.review;
    } catch (error) {
      Alert.alert("오류", `모델 실행 중 오류가 발생했습니다: ${error.message}`);
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={styles.loadingText}>리뷰 작성 중...</Text>
        </View>
      )}

      <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
        {image ? (
          <Image
            source={{ uri: image }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.placeholder}>
            <Icon name="upload" size={24} color="#A3A3A3" />
            <Text style={styles.uploadText}>이미지 업로드</Text>
            <Text style={styles.fileTypes}>JPG, JPEG, PNG</Text>
          </View>
        )}
      </TouchableOpacity>

      <TextInput
        placeholder="음식명을 입력하세요"
        value={foodNameState}
        onChangeText={setFoodName}
        style={styles.input}
      />

      <View style={styles.ratingWrapper}>
        {["배달", "맛", "양", "가격"].map((category) => (
          <View key={category} style={styles.ratingRow}>
            <Text>{category}</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleRating(category, star)}
                >
                  <Icon
                    name="star"
                    size={24}
                    color={star <= ratingsState[category] ? "gold" : "#ccc"}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={submitReview}>
        <Text style={styles.submitButtonText}>리뷰 작성하기</Text>
      </TouchableOpacity>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    padding: 16,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    zIndex: 1,
  },
  imagePicker: {
    width: "100%",
    height: "30%",
    borderColor: "#ccc",
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  uploadText: {
    marginTop: 8,
    fontSize: 16,
    color: "#A3A3A3",
  },
  fileTypes: {
    fontSize: 12,
    color: "#A3A3A3",
  },
  input: {
    width: "100%",
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    marginBottom: 16,
  },
  ratingWrapper: {
    width: "100%",
    marginBottom: 16,
  },
  ratingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: "row",
  },
  submitButton: {
    backgroundColor: "#007BFF",
    padding: 12,
    borderRadius: 4,
    width: "100%",
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
  },
});

export default Upload;
