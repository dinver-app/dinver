import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RestaurantCardProps } from "@/constants/Types";

const RestaurantCard = ({
  name,
  distance,
  rating,
  reviewCount,
  imageUrl,
  isClaimed,
  isPromo = false,
  onFavoritePress,
}: RestaurantCardProps) => {
  return (
    <View
      style={{
        width: "100%",
        height: 220,
        marginBottom: 16,
        position: "relative",
      }}
    >
      <View
        style={{
          width: "100%",
          height: 160,
          borderRadius: 8,
          position: "relative",
        }}
      >
        <Image
          source={require("../assets/images/dinver-hero.png")}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 8,
            position: "absolute",
          }}
          resizeMode="cover"
        />

        {/* Promo badge */}
        {isPromo && (
          <View
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              backgroundColor: "#5617E9",
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 10,
            }}
          >
            <Text className="text-white font-medium">Promo</Text>
          </View>
        )}

        {/* Heart button */}
        <View
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 10,
          }}
        >
          <TouchableOpacity
            onPress={onFavoritePress}
            style={{
              backgroundColor: "black",
              padding: 5,
              borderRadius: 10,
            }}
          >
            <Ionicons name="heart-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Rating badge */}
        <View
          style={{
            position: "absolute",
            bottom: 10,
            right: 10,
            zIndex: 10,
            backgroundColor: "black",
            padding: 5,
            borderRadius: 10,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text className="text-white ml-1">
            {rating} ({reviewCount})
          </Text>
        </View>
      </View>

      {/* Restaurant info */}
      <View
        style={{
          marginTop: 10,
        }}
      >
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 0,
            }}
          >
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                gap: 10,
              }}
            >
              <View
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Text className="text-white text-xl font-semibold font-degular-semibold">
                  {name}
                </Text>
                {!isClaimed && (
                  <View
                    style={{
                      marginLeft: 5,
                    }}
                  >
                    <Image
                      source={require("../assets/images/claimed-icon.png")}
                      style={{
                        width: 20,
                        height: 20,
                      }}
                      resizeMode="contain"
                    />
                  </View>
                )}
              </View>
              <View
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: 5,
                }}
              >
                {/* Food type icons */}
                <View
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    gap: 5,
                  }}
                >
                  <View
                    style={{
                      borderRadius: 10,
                    }}
                  >
                    <Ionicons
                      name="restaurant-outline"
                      size={18}
                      color="#666"
                    />
                  </View>
                  <View
                    style={{
                      borderRadius: 10,
                    }}
                  >
                    <Ionicons name="wine-outline" size={18} color="#666" />
                  </View>
                </View>
              </View>
            </View>
            <Text
              style={{
                color: "#666",
                fontSize: 16,
                fontFamily: "degular-medium",
                marginTop: -5,
              }}
            >
              {distance}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default RestaurantCard;
