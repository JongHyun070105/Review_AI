import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

export default function Review() {
  const navigation = useNavigation();
  const route = useRoute();
  const review = route.params?.review || "작성된 리뷰가 없습니다.";
  const foodName = route.params?.foodName || "음식명 없음";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>리뷰 AI</Text>
      <View style={styles.reviewBox}>
        <Text style={styles.reviewText}>{review}</Text>
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          navigation.navigate("Upload", {
            foodName,
            imageUri: route.params?.imageUri || null,
            ratings: route.params?.ratings || {
              delivery: 0,
              taste: 0,
              quantity: 0,
              price: 0,
            },
          })
        }
      >
        <Text style={styles.buttonText}>다시 작성하기</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Home")}
      >
        <Text style={styles.buttonText}>홈으로 돌아가기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
  },
  reviewBox: {
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    width: "100%",
  },
  reviewText: {
    fontSize: 16,
  },
  button: {
    backgroundColor: "#007BFF",
    padding: 12,
    borderRadius: 4,
    width: "100%",
    alignItems: "center",
    marginBottom: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
  },
});
