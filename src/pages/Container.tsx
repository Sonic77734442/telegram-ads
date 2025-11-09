import React from "react";

const Container = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "8px 15px",
    }}
  >
    {children}
  </div>
);

export default Container;
