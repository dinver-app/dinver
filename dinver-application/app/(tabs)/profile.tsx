import { View, Text, TouchableOpacity, TextInput } from "react-native";
import React, { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useRouter } from "expo-router";

interface AuthFormProps {
  isRegistering: boolean;
  onSubmit: (data: {
    email: string;
    password: string;
    name: string;
  }) => Promise<void>;
  loading: boolean;
}

interface AuthData {
  email: string;
  password: string;
  name: string;
}

// Izdvojena forma kao zasebna komponenta
const AuthForm = ({ isRegistering, onSubmit, loading }: AuthFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    try {
      setError("");
      await onSubmit({ email, password, name });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Došlo je do greške");
    }
  };

  return (
    <View className="flex-1 items-center justify-center p-4 gap-4">
      <Text className="text-2xl font-bold text-white mb-4">
        {isRegistering ? "Registracija" : "Prijava"}
      </Text>

      {isRegistering && (
        <TextInput
          className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white"
          placeholder="Ime"
          placeholderTextColor="#9ca3af"
          value={name}
          onChangeText={setName}
        />
      )}

      <TextInput
        className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white"
        placeholder="Email"
        placeholderTextColor="#9ca3af"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white"
        placeholder="Lozinka"
        placeholderTextColor="#9ca3af"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error && <Text className="text-red-500 text-center mb-2">{error}</Text>}

      <TouchableOpacity
        className="bg-blue-500 px-6 py-3 rounded-full w-full"
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text className="text-white font-semibold text-center">
          {loading
            ? "Učitavanje..."
            : isRegistering
            ? "Registriraj se"
            : "Prijavi se"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const Profile = () => {
  const router = useRouter();
  const { isAuthenticated, user, login, register, logout, loading } =
    useContext(AuthContext);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleAuth = async ({ email, password, name }: AuthData) => {
    if (isRegistering) {
      await register(email, password, name);
    } else {
      await login(email, password);
    }
    router.push("/");
  };

  const NotAuthenticatedView = () => (
    <View className="flex-1">
      <AuthForm
        isRegistering={isRegistering}
        onSubmit={handleAuth}
        loading={loading}
      />

      <TouchableOpacity
        onPress={() => setIsRegistering(!isRegistering)}
        className="items-center mb-4"
      >
        <Text className="text-blue-400">
          {isRegistering
            ? "Već imate račun? Prijavite se"
            : "Nemate račun? Registrirajte se"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const AuthenticatedView = () => (
    <View className="flex-1 items-center justify-center p-4 gap-4">
      <Text className="text-2xl font-bold text-white">
        Dobrodošli, {user?.firstName} {user?.lastName}
      </Text>
      <Text className="text-white">{user?.email}</Text>

      <TouchableOpacity
        className="bg-red-500 px-6 py-3 rounded-full"
        onPress={logout}
      >
        <Text className="text-white font-semibold">Odjava</Text>
      </TouchableOpacity>
    </View>
  );

  return isAuthenticated ? <AuthenticatedView /> : <NotAuthenticatedView />;
};

export default Profile;
