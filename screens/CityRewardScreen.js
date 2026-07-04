import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function CityRewardScreen({ route, navigation }) {
  const city = route?.params?.city || "Unknown City";
  const country = route?.params?.country || "Unknown Country";

  return (
    <View style={styles.container}>

      <Text style={styles.title}>🎉 Check-in Complete!</Text>

      <Text style={styles.city}>{city}</Text>

      <Text style={styles.country}>{country}</Text>

      <View style={styles.rewardBox}>
        <Text style={styles.reward}>+120 XP</Text>
        <Text style={styles.reward}>+45 Coins</Text>
        <Text style={styles.badge}>🏅 City Explorer</Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Карта")}
      >
        <Text style={styles.buttonText}>Continue Exploring</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container:{
    flex:1,
    backgroundColor:"#071d36",
    justifyContent:"center",
    alignItems:"center",
    padding:24,
  },

  title:{
    color:"#fff",
    fontSize:34,
    fontWeight:"bold",
    marginBottom:30,
  },

  city:{
    color:"#fff",
    fontSize:42,
    fontWeight:"900",
  },

  country:{
    color:"#8fc5ff",
    fontSize:24,
    marginBottom:35,
  },

  rewardBox:{
    width:"100%",
    backgroundColor:"#102b52",
    borderRadius:22,
    padding:25,
    alignItems:"center",
    marginBottom:40,
  },

  reward:{
    color:"#36d399",
    fontSize:30,
    fontWeight:"bold",
    marginVertical:6,
  },

  badge:{
    color:"#FFD54A",
    fontSize:24,
    marginTop:14,
    fontWeight:"bold",
  },

  button:{
    backgroundColor:"#36d399",
    paddingVertical:18,
    paddingHorizontal:45,
    borderRadius:18,
  },

  buttonText:{
    color:"#071d36",
    fontSize:18,
    fontWeight:"bold",
  },
});