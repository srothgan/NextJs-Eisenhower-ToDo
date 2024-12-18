import { Toaster } from "@/components/ui/toaster"
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AuthProvider } from "./providers";
import "./globals.css";

export const metadata = {
  title: "Eisenhower ToDo",
  description: "Generated by Simon Rothgang",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
      <AuthProvider>
        <Navbar/>
        <div className="flex-1" style={{ minHeight: `calc(100vh - 150px)` }}>
              {children}
        </div>
        <Toaster />
        <Footer/>
      </AuthProvider>
      </body>
    </html>
  );
}
