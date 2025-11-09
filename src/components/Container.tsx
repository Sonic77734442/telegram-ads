import React from "react";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

const Container = ({ children, className = "" }: ContainerProps) => (
  <div className={`w-full max-w-[842px] mx-auto px-4 ${className}`}>
    {children}
  </div>
);

export default Container;
