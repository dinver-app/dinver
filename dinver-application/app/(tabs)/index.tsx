import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useContext } from "react";
import * as Location from "expo-location";
import { AuthContext } from "../../context/AuthContext";

export default function HomeScreen() {
  const { user } = useContext(AuthContext);
  const [address, setAddress] = useState<string | null>(
    "Ulica Grge Novaka 1, Zagreb"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Privremeno zakomentirano dohvaćanje lokacije
  /*
  const getCurrentLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    console.log("Location permission status:", status);

    if (status !== "granted") {
      setErrorMsg("Dozvola za pristup lokaciji nije odobrena");
      return;
    }

    try {
      let location = await Location.getCurrentPositionAsync({});
      console.log("Current location:", location);

      let result = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      console.log("Geocoding result:", result);

      if (result[0]) {
        const { street, city } = result[0];
        setAddress(`${street}, ${city}`);
      }
    } catch (error) {
      console.error("Location error:", error);
      setErrorMsg("Greška pri dohvaćanju lokacije");
    }
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);
  */

  return (
    <SafeAreaView className="h-full">
      <ScrollView contentContainerStyle={{ height: "100%" }}>
        <View className="flex-1 items-center justify-center">
          {user && (
            <Text className="text-white text-lg mb-4">
              Dobrodošli, {user.firstName} {user.lastName}!
            </Text>
          )}
          <TouchableOpacity className="flex-row items-center mb-4">
            <Text className="text-lg text-white">
              📍 {address || "Odaberi lokaciju"}
            </Text>
          </TouchableOpacity>

          <Text className="text-2xl font-bold text-white">
            Moja Početna Stranica
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
