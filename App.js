import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import useCustomFonts from "./Font";
import Upload from "./Upload";
import Review from "./Review";

const Stack = createNativeStackNavigator();

export default function App() {
  const fontsLoaded = useCustomFonts();

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Upload">
        <Stack.Screen
          name="Upload"
          component={Upload}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Review"
          component={Review}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 18,
    fontFamily: "doyen",
  },
});
