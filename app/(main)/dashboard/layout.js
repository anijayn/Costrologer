import { BarLoader } from "react-spinners";
import DashboardPage from "./page";
import { Suspense } from "react";

const DashboardLayout = () => {
  return (
    <div>
      <h1 className="text-6xl font-bold gradient-title">Dashboard</h1>
      <Suspense
        fallback={<BarLoader className="mt-4" width={"100%"} color="#9333ea" />}
      >
        <DashboardPage />
      </Suspense>
    </div>
  );
};

export default DashboardLayout;
