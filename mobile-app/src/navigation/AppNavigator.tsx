import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import SplashScreen from "../screens/auth/SplashScreen";
import IntroSliderScreen from "../screens/auth/IntroSliderScreen";
import LoanIntentScreen from "../screens/auth/LoanIntentScreen";
import PhoneEntryScreen from "../screens/auth/PhoneEntryScreen";
import OTPScreen from "../screens/auth/OTPScreen";
import ResumeScreen from "../screens/auth/ResumeScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import SetPinScreen from "../screens/auth/SetPinScreen";

import ProfileSetupScreen from "../screens/main/ProfileSetupScreen";
import KYCScreen from "../screens/main/KYCScreen";
import BankLinkingScreen from "../screens/main/BankLinkingScreen";
import LoanConfigurationScreen from "../screens/main/LoanConfigurationScreen";
import ReviewTermsScreen from "../screens/main/ReviewTermsScreen";
import ApprovalStatusScreen from "../screens/main/ApprovalStatusScreen";

import HomeScreen from "../screens/main/HomeScreen";
import LoansScreen from "../screens/main/LoansScreen";
import ApplyScreen from "../screens/main/ApplyScreen";
import RepayScreen from "../screens/main/RepayScreen";
import ProfileScreen from "../screens/main/ProfileScreen";
import SupportScreen from "../screens/main/SupportScreen";
import DisbursementStatusScreen from "../screens/main/DisbursementStatusScreen";

import { BottomNavBar } from "./BottomNavBar";

type RootStackParamList = {
  Splash: undefined;
  IntroSlider: undefined;
  LoanIntent: undefined;
  PhoneEntry: undefined;
  OTP: { phone: string; channel: "sms" | "email" | "whatsapp"; debugOtp?: string };
  Resume: undefined;
  Login: { biometric?: boolean; setupPin?: boolean };
  SetPin: undefined;
  
  ProfileSetup: undefined;
  KYC: undefined;
  BankLinking: undefined;
  LoanConfiguration: undefined;
  ReviewTerms: undefined;
  ApprovalStatus: undefined;

  Main: { screen?: keyof TabParamList };
  DisbursementStatus: undefined;
  Support: undefined;
};

type TabParamList = {
  Home: undefined;
  Loans: undefined;
  Apply: undefined;
  Repay: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
        } as any,
      }}
      tabBar={(props) => <BottomNavBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Loans" component={LoansScreen} />
      <Tab.Screen name="Apply" component={ApplyScreen} />
      <Tab.Screen name="Repay" component={RepayScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Splash">
        {/* Entry Point */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        
        {/* Auth Flow */}
        <Stack.Screen name="IntroSlider" component={IntroSliderScreen} />
        <Stack.Screen name="LoanIntent" component={LoanIntentScreen} />
        <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} />
        <Stack.Screen name="OTP" component={OTPScreen} />
        <Stack.Screen name="Resume" component={ResumeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SetPin" component={SetPinScreen} />

        {/* Onboarding Flow */}
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <Stack.Screen name="KYC" component={KYCScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="BankLinking" component={BankLinkingScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="LoanConfiguration" component={LoanConfigurationScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="ReviewTerms" component={ReviewTermsScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="ApprovalStatus" component={ApprovalStatusScreen} options={{ gestureEnabled: false }} />

        {/* Main App */}
        <Stack.Screen name="Main" component={Tabs} />
        <Stack.Screen name="DisbursementStatus" component={DisbursementStatusScreen} />
        <Stack.Screen name="Support" component={SupportScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
