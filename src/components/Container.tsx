import React from "react";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

const Container = ({ children, className = "" }: ContainerProps) => (
  <div className={`mx-auto w-full max-w-[842px] px-4 md:px-0 ${className}`}>
    {children}
  </div>
);

export default Container;
