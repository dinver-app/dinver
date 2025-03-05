import React from "react";
import { useTranslation } from "react-i18next";
import { MdTranslate } from "react-icons/md";

interface TranslateButtonProps {
  onClick: () => void;
  className?: string;
}

const TranslateButton: React.FC<TranslateButtonProps> = ({
  onClick,
  className,
}) => {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 ${className}`}
      title={t("translate")}
    >
      <MdTranslate className="w-4 h-4" />
      {t("translate")}
    </button>
  );
};

export default TranslateButton;
