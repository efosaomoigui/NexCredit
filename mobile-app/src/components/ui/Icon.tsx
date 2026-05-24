import React from "react";
import {
  Bell,
  Check,
  ChevronRight,
  CreditCard,
  Eye,
  Headset,
  FileText,
  Home,
  Info,
  LayoutGrid,
  Banknote,
  Link2,
  LogOut,
  PlusCircle,
  Repeat,
  ShieldCheck,
  Star,
  User,
  Wallet,
} from "lucide-react-native";



export function Icon({
  name,
  size = 20,
  color,
  style,
}: {
  name:
    | "grid_view"
    | "payments"
    | "person"
    | "home"
    | "loans"
    | "apply"
    | "repay"
    | "profile"
    | "bell"
    | "chevron"
    | "check"
    | "eye"
    | "shield"
    | "star"
    | "wallet"
    | "doc"
    | "info"
    | "headset"
    | "link"
    | "logout";
  size?: number;
  color: string;
  style?: any;
}) {
  const props = { size, color, style } as const;
  if (name === "grid_view") return <LayoutGrid {...props} />;
  if (name === "payments") return <Banknote {...props} />;
  if (name === "person") return <User {...props} />;

  if (name === "home") return <Home {...props} />;

  if (name === "loans") return <CreditCard {...props} />;
  if (name === "apply") return <PlusCircle {...props} />;
  if (name === "repay") return <Repeat {...props} />;
  if (name === "profile") return <User {...props} />;
  if (name === "bell") return <Bell {...props} />;
  if (name === "chevron") return <ChevronRight {...props} />;
  if (name === "check") return <Check {...props} />;
  if (name === "eye") return <Eye {...props} />;
  if (name === "shield") return <ShieldCheck {...props} />;
  if (name === "star") return <Star {...props} fill={color} />;
  if (name === "wallet") return <Wallet {...props} />;
  if (name === "doc") return <FileText {...props} />;
  if (name === "info") return <Info {...props} />;
  if (name === "headset") return <Headset {...props} />;
  if (name === "link") return <Link2 {...props} />;
  return <LogOut {...props} />;
}
