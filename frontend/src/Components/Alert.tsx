import React from "react";

export interface AlertBoxProps {
  title: string;
  msg: string;
  onClose?: () => void; // Optional close handler
}

const AlertBox: React.FC<AlertBoxProps> = ({ title, msg, onClose }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
      <div className="bg-gray-800 bg-opacity-50 border border-gray-700 rounded-xl p-6 max-w-md w-full shadow-2xl backdrop-blur-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-white focus:outline-none"
            >
              ✕
            </button>
          )}
        </div>
        <p className="text-gray-300">{msg}</p>
      </div>
    </div>
  );
};

export default AlertBox;
