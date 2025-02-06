import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Costrologer",
  description: "A cool app to save the heat from your spending spree",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <Header />
          <main className="min-h-screen"> {children}</main>
          <Toaster richColors />
          <footer className="bg-blue-50 py-12">
            <div className="container text-center py-4 mx-auto text-gray-600">
              Made with {"<3"} in India
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
