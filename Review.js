import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Clipboard,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

const { width, height } = Dimensions.get("window");

export default function Review({ route }) {
  const { review } = route.params || {};
  const navigation = useNavigation();

  const copyToClipboard = () => {
    Clipboard.setString(review);
    alert("리뷰가 클립보드에 복사되었습니다!");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>리뷰 AI</Text>
      <View style={styles.reviewBox}>
        <Text style={styles.reviewText}>
          {review || "작성된 리뷰가 없습니다."}
        </Text>
        <TouchableOpacity style={styles.copyButton} onPress={copyToClipboard}>
          <Ionicons name="copy-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.homeButton}
        onPress={() => navigation.navigate("Upload")}
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
    justifyContent: "flex-start",
    padding: width * 0.01,
    width: "100%",
    height: "100%",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: height * 0.08,
    fontWeight: "bold",
    marginTop: height * 0.08,
    marginBottom: height * 0.04,
    fontFamily: "doyen",
  },
  reviewBox: {
    backgroundColor: "#F1F1F1",
    borderColor: "#BDBDBD",
    borderWidth: 2,
    height: height * 0.6,
    width: "90%",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    borderRadius: 10,
    marginBottom: height * 0.03,
    position: "relative",
    padding: 16,
  },
  reviewText: {
    marginTop: 50,
    fontSize: 16,
    color: "#000",
    fontFamily: "doyen",
  },
  copyButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#000",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  homeButton: {
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
});
