import React from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import useCustomFonts from "./Font"; // 폰트 로딩 훅
import Upload from "./Upload"; // 수정된 업로드 컴포넌트
import Review from "./Review"; // 리뷰 컴포넌트

const Stack = createNativeStackNavigator(); // 스택 네비게이터 생성

export default function App() {
  const fontsLoaded = useCustomFonts(); // 폰트 로딩 상태 확인

  if (!fontsLoaded) {
    return null; // 폰트가 로드될 때까지 렌더링하지 않음
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }} // 네비게이션 바 숨기기
        />
        <Stack.Screen
          name="Review"
          component={Review}
          options={{ headerShown: false }} // 네비게이션 바 숨기기
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.MainTitle}>리뷰 AI</Text>
      <Upload />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  MainTitle: {
    fontFamily: "doyen",
    marginTop: 70,
    fontSize: 50,
    textAlign: "center",
  },
});
