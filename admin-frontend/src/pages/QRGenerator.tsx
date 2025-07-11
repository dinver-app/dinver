import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import { toast } from "react-hot-toast";
import {
  QrCodeIcon,
  PhotoIcon,
  DocumentArrowDownIcon,
  SparklesIcon,
  LockClosedIcon,
  EyeIcon,
  AdjustmentsHorizontalIcon,
  SwatchIcon,
  ArrowsPointingOutIcon,
} from "@heroicons/react/24/outline";

const QRGenerator = () => {
  const { t } = useTranslation();
  const [isPremium, setIsPremium] = useState(false); // Toggle za testiranje

  // Basic QR states
  const [qrTextColor, setQrTextColor] = useState("#000000");
  const [qrBackgroundColor, setQrBackgroundColor] = useState("#FFFFFF");
  const [qrBorderColor, setQrBorderColor] = useState("#E5E7EB");
  const [qrBorderWidth, setQrBorderWidth] = useState(2);
  const [qrSize, setQrSize] = useState(200);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);

  // Advanced QR options
  const [showDinverLogo, setShowDinverLogo] = useState(true);
  const [showRestaurantName, setShowRestaurantName] = useState(true);
  const [showScanText, setShowScanText] = useState(true);
  const [textPosition, setTextPosition] = useState("top");
  const [qrBackgroundStyle, setQrBackgroundStyle] = useState("full");
  const [padding, setPadding] = useState(24);
  const [selectedPreset, setSelectedPreset] = useState("classic");

  // Premium features
  const [customLogo, setCustomLogo] = useState<File | null>(null);
  const [customLogoUrl, setCustomLogoUrl] = useState<string>("");
  const [customText, setCustomText] = useState(
    t("scan_for_e_menu_placeholder")
  );
  const [qrStyle, setQrStyle] = useState("squares"); // squares, dots, rounded
  const [errorCorrection, setErrorCorrection] = useState("M"); // L, M, Q, H
  const [exportSizes, setExportSizes] = useState<string[]>(["200px"]);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);

  const currentRestaurant = JSON.parse(
    localStorage.getItem("currentRestaurant") || "{}"
  );
  const restaurantSlug = currentRestaurant.slug;
  const menuUrl = `https://dinver.eu/restaurants/${restaurantSlug}/menu?src=qr`;

  // Ensure Dinver logo is always shown for Basic users
  useEffect(() => {
    if (!isPremium && !showDinverLogo) {
      setShowDinverLogo(true);
    }
  }, [isPremium, showDinverLogo]);

  // Handle logo upload
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCustomLogo(file);
      const url = URL.createObjectURL(file);
      setCustomLogoUrl(url);
    }
  };

  // Preset functions
  const applyPreset = (preset: string) => {
    setSelectedPreset(preset);
    switch (preset) {
      case "minimal":
        // For Basic users, always show Dinver logo
        setShowDinverLogo(!isPremium);
        setShowRestaurantName(false);
        setShowScanText(false);
        setTextPosition("none");
        setQrBackgroundStyle("none");
        setQrBorderWidth(0);
        setPadding(16);
        setQrSize(250);
        break;
      case "classic":
        setShowDinverLogo(true);
        setShowRestaurantName(true);
        setShowScanText(true);
        setTextPosition("top");
        setQrBackgroundStyle("full");
        setQrBorderWidth(2);
        setPadding(24);
        setQrSize(200);
        setQrTextColor("#000000");
        setQrBackgroundColor("#FFFFFF");
        setQrBorderColor("#E5E7EB");
        break;
      case "elegant":
        setShowDinverLogo(true);
        setShowRestaurantName(true);
        setShowScanText(false);
        setTextPosition("both");
        setQrBackgroundStyle("qr_only");
        setQrBorderWidth(0);
        setPadding(32);
        setQrSize(180);
        setQrTextColor("#1F2937");
        setQrBackgroundColor("#FFFFFF");
        setQrBorderColor("#E5E7EB");
        break;
      case "bold":
        setShowDinverLogo(true);
        setShowRestaurantName(true);
        setShowScanText(true);
        setTextPosition("top");
        setQrBackgroundStyle("full");
        setQrBorderWidth(4);
        setPadding(20);
        setQrSize(220);
        setQrTextColor("#FFFFFF");
        setQrBackgroundColor("#1F2937");
        setQrBorderColor("#374151");
        break;
      case "premium":
        if (!isPremium) {
          toast.error(t("premium_feature_only"));
          return;
        }
        setShowDinverLogo(false);
        setShowRestaurantName(true);
        setShowScanText(true);
        setTextPosition("both");
        setQrBackgroundStyle("qr_only");
        setQrBorderWidth(0);
        setPadding(40);
        setQrSize(160);
        setQrTextColor("#1F2937");
        setQrBackgroundColor("#FFFFFF");
        setQrBorderColor("#E5E7EB");
        setQrStyle("rounded");
        setErrorCorrection("H");
        break;
    }
  };

  // Download single QR code
  const downloadQRCode = async () => {
    setIsGeneratingQR(true);
    try {
      const qrElement = document.getElementById("qr-code-container");
      if (!qrElement) {
        toast.error(t("qr_not_found_error"));
        return;
      }

      const canvas = await html2canvas(qrElement, {
        backgroundColor:
          qrBackgroundStyle === "full" ? qrBackgroundColor : "transparent",
        scale: 2,
        useCORS: true,
      });

      const link = document.createElement("a");
      link.download = `qr-menu-${restaurantSlug}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast.success(t("qr_download_success"));
    } catch (error) {
      console.error("Greška pri generiranju QR koda:", error);
      toast.error(t("qr_generation_error"));
    } finally {
      setIsGeneratingQR(false);
    }
  };

  // Bulk download (Premium feature)
  const downloadBulkQR = async () => {
    if (!isPremium) {
      toast.error(t("bulk_export_premium_only"));
      return;
    }

    setIsBulkGenerating(true);
    try {
      const sizes = exportSizes.map((size) => parseInt(size));
      const promises = sizes.map(async (size) => {
        const qrElement = document.getElementById("qr-code-container");
        if (!qrElement) return null;

        // Temporarily change size
        const originalSize = qrSize;
        setQrSize(size);

        // Wait for re-render
        await new Promise((resolve) => setTimeout(resolve, 100));

        const canvas = await html2canvas(qrElement, {
          backgroundColor:
            qrBackgroundStyle === "full" ? qrBackgroundColor : "transparent",
          scale: 2,
          useCORS: true,
        });

        setQrSize(originalSize);

        return {
          size,
          dataUrl: canvas.toDataURL("image/png"),
        };
      });

      const results = await Promise.all(promises);

      // Create zip file (simplified - just download multiple files)
      results.forEach((result) => {
        if (result) {
          const link = document.createElement("a");
          link.download = `qr-menu-${restaurantSlug}-${result.size}px.png`;
          link.href = result.dataUrl;
          link.click();
        }
      });

      toast.success(t("bulk_download_success"));
    } catch (error) {
      console.error("Greška pri bulk generiranju:", error);
      toast.error(t("bulk_generation_error"));
    } finally {
      setIsBulkGenerating(false);
    }
  };

  const PremiumBadge = ({ children }: { children: React.ReactNode }) => (
    <div className="relative">
      {children}
      <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
        <SparklesIcon className="w-3 h-3" />
        {t("premium_plan")}
      </div>
    </div>
  );

  const LockedFeature = ({ children }: { children: React.ReactNode }) => (
    <div className="relative opacity-50">
      {children}
      <div className="absolute inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center rounded-lg">
        <LockClosedIcon className="w-6 h-6 text-gray-500" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <QrCodeIcon className="w-8 h-8 text-blue-600" />
                {t("qr_generator_page_title")}
              </h1>
              <p className="mt-2 text-gray-600">
                {t("qr_generator_page_subtitle")}
              </p>
            </div>

            {/* Premium Toggle */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{t("plan_label")}</span>
                <button
                  onClick={() => setIsPremium(!isPremium)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isPremium
                      ? "bg-gradient-to-r from-purple-600 to-pink-600"
                      : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isPremium ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span
                  className={`text-sm font-medium ${
                    isPremium ? "text-purple-600" : "text-gray-500"
                  }`}
                >
                  {isPremium ? t("premium_plan") : t("basic_plan")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Sidebar - Customization */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <AdjustmentsHorizontalIcon className="w-5 h-5 text-blue-600" />
                {t("customize_qr_code_title")}
              </h3>

              {/* Presets Section */}
              <div className="mb-8">
                <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                  <SwatchIcon className="w-4 h-4 text-blue-600" />
                  {t("presets_title")}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    {
                      id: "minimal",
                      name: t("minimalistic_preset"),
                      desc: t("minimalistic_preset_desc"),
                      premium: false,
                    },
                    {
                      id: "classic",
                      name: t("classic_preset"),
                      desc: t("classic_preset_desc"),
                      premium: false,
                    },
                    {
                      id: "elegant",
                      name: t("elegant_preset"),
                      desc: t("elegant_preset_desc"),
                      premium: false,
                    },
                    {
                      id: "bold",
                      name: t("bold_preset"),
                      desc: t("bold_preset_desc"),
                      premium: false,
                    },
                    {
                      id: "premium",
                      name: t("premium_preset_name"),
                      desc: t("premium_preset_desc"),
                      premium: true,
                    },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => applyPreset(preset.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedPreset === preset.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      } ${!isPremium && preset.premium ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">
                            {preset.name}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {preset.desc}
                          </div>
                        </div>
                        {preset.premium && (
                          <SparklesIcon className="w-4 h-4 text-purple-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Options */}
              <div className="mb-8">
                <h4 className="text-sm font-medium text-gray-700 mb-4">
                  {t("content_section")}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isPremium ? (
                    <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showDinverLogo}
                        onChange={(e) => setShowDinverLogo(e.target.checked)}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium text-sm">
                          {t("show_dinver_logo_label")}
                        </div>
                        <div className="text-xs text-gray-500">
                          {t("show_dinver_logo_desc")}
                        </div>
                      </div>
                    </label>
                  ) : (
                    <LockedFeature>
                      <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-not-allowed">
                        <input
                          type="checkbox"
                          checked={true}
                          disabled
                          className="mr-3"
                        />
                        <div>
                          <div className="font-medium text-sm">
                            {t("show_dinver_logo_label")}
                          </div>
                          <div className="text-xs text-gray-500">
                            {t("premium_option_text")}
                          </div>
                        </div>
                      </label>
                    </LockedFeature>
                  )}

                  <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showRestaurantName}
                      onChange={(e) => setShowRestaurantName(e.target.checked)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-sm">
                        {t("show_restaurant_name_label")}
                      </div>
                      <div className="text-xs text-gray-500">
                        {t("show_restaurant_name_desc")}
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showScanText}
                      onChange={(e) => setShowScanText(e.target.checked)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-sm">
                        {t("show_scan_text_label")}
                      </div>
                      <div className="text-xs text-gray-500">
                        {t("show_scan_text_desc")}
                      </div>
                    </div>
                  </label>

                  {isPremium ? (
                    <PremiumBadge>
                      <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!customLogo}
                          onChange={(e) => {
                            if (!e.target.checked) {
                              setCustomLogo(null);
                              setCustomLogoUrl("");
                            }
                          }}
                          className="mr-3"
                        />
                        <div>
                          <div className="font-medium text-sm">
                            {t("use_custom_logo_label")}
                          </div>
                          <div className="text-xs text-gray-500">
                            {t("use_custom_logo_desc")}
                          </div>
                        </div>
                      </label>
                    </PremiumBadge>
                  ) : (
                    <LockedFeature>
                      <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-not-allowed">
                        <input type="checkbox" disabled className="mr-3" />
                        <div>
                          <div className="font-medium text-sm">
                            {t("use_custom_logo_label")}
                          </div>
                          <div className="text-xs text-gray-500">
                            {t("premium_option_text")}
                          </div>
                        </div>
                      </label>
                    </LockedFeature>
                  )}
                </div>

                {/* Custom Logo Upload */}
                {isPremium && (
                  <div className="mt-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="block w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-gray-400 transition-colors"
                    >
                      <PhotoIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <span className="text-sm text-gray-600">
                        {customLogo
                          ? customLogo.name
                          : t("click_to_upload_logo")}
                      </span>
                    </label>
                  </div>
                )}

                {/* Custom Text */}
                {isPremium && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("customize_text_label")}
                    </label>
                    <input
                      type="text"
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      placeholder={t("scan_for_e_menu_placeholder")}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              {/* Layout Options */}
              <div className="mb-8">
                <h4 className="text-sm font-medium text-gray-700 mb-4">
                  {t("layout_section")}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("text_position_label")}
                    </label>
                    <select
                      value={textPosition}
                      onChange={(e) => setTextPosition(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="top">{t("position_top")}</option>
                      <option value="bottom">{t("position_bottom")}</option>
                      <option value="both">{t("position_both")}</option>
                      <option value="none">{t("position_none")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("background_style_label")}
                    </label>
                    <select
                      value={qrBackgroundStyle}
                      onChange={(e) => setQrBackgroundStyle(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="full">{t("background_full")}</option>
                      <option value="qr_only">{t("background_qr_only")}</option>
                      <option value="none">{t("background_none")}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Colors */}
              <div className="mb-8">
                <h4 className="text-sm font-medium text-gray-700 mb-4">
                  {t("colors_section")}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("text_color_label")}
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={qrTextColor}
                        onChange={(e) => setQrTextColor(e.target.value)}
                        className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
                      />
                      <span className="text-sm text-gray-600">
                        {qrTextColor}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("background_color_label")}
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={qrBackgroundColor}
                        onChange={(e) => setQrBackgroundColor(e.target.value)}
                        className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
                      />
                      <span className="text-sm text-gray-600">
                        {qrBackgroundColor}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("border_color_label")}
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={qrBorderColor}
                        onChange={(e) => setQrBorderColor(e.target.value)}
                        className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
                      />
                      <span className="text-sm text-gray-600">
                        {qrBorderColor}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Size and Spacing */}
              <div className="mb-8">
                <h4 className="text-sm font-medium text-gray-700 mb-4">
                  {t("size_spacing_section")}
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("qr_size_label")} ({qrSize}px)
                    </label>
                    <input
                      type="range"
                      min="100"
                      max="400"
                      step="10"
                      value={qrSize}
                      onChange={(e) => setQrSize(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("spacing_label")} ({padding}px)
                    </label>
                    <input
                      type="range"
                      min="8"
                      max="48"
                      step="4"
                      value={padding}
                      onChange={(e) => setPadding(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("border_width_label")} ({qrBorderWidth}px)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="8"
                      step="1"
                      value={qrBorderWidth}
                      onChange={(e) => setQrBorderWidth(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Premium QR Options */}
              {isPremium && (
                <div className="mb-8">
                  <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-purple-600" />
                    {t("advanced_options_section")}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("qr_style_label")}
                      </label>
                      <select
                        value={qrStyle}
                        onChange={(e) => setQrStyle(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="squares">{t("style_squares")}</option>
                        <option value="dots">{t("style_dots")}</option>
                        <option value="rounded">{t("style_rounded")}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("error_correction_label")}
                      </label>
                      <select
                        value={errorCorrection}
                        onChange={(e) => setErrorCorrection(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="L">{t("error_correction_low")}</option>
                        <option value="M">
                          {t("error_correction_medium")}
                        </option>
                        <option value="Q">{t("error_correction_high")}</option>
                        <option value="H">
                          {t("error_correction_highest")}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Export Options */}
              <div className="mb-8">
                <h4 className="text-sm font-medium text-gray-700 mb-4">
                  {t("export_options_section")}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={downloadQRCode}
                    disabled={isGeneratingQR}
                    className="flex items-center justify-center gap-2 p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <DocumentArrowDownIcon className="w-5 h-5" />
                    {isGeneratingQR
                      ? t("generating_text")
                      : t("download_qr_button")}
                  </button>

                  {isPremium ? (
                    <PremiumBadge>
                      <button
                        onClick={downloadBulkQR}
                        disabled={isBulkGenerating}
                        className="flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors disabled:opacity-50 w-full"
                      >
                        <ArrowsPointingOutIcon className="w-5 h-5" />
                        {isBulkGenerating
                          ? t("generating_text")
                          : t("bulk_export_button")}
                      </button>
                    </PremiumBadge>
                  ) : (
                    <LockedFeature>
                      <button
                        disabled
                        className="flex items-center justify-center gap-2 p-4 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed w-full"
                      >
                        <ArrowsPointingOutIcon className="w-5 h-5" />
                        {t("bulk_export_premium_button")}
                      </button>
                    </LockedFeature>
                  )}
                </div>

                {/* Bulk Export Sizes */}
                {isPremium && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("bulk_export_sizes_label")}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["150px", "200px", "250px", "300px", "400px"].map(
                        (size) => (
                          <label key={size} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={exportSizes.includes(size)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setExportSizes([...exportSizes, size]);
                                } else {
                                  setExportSizes(
                                    exportSizes.filter((s) => s !== size)
                                  );
                                }
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm">{size}</span>
                          </label>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Preview */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <EyeIcon className="w-5 h-5 text-blue-600" />
                {t("preview_title")}
              </h3>

              <div className="flex justify-center">
                <div
                  id="qr-code-container"
                  className="flex flex-col items-center rounded-lg"
                  style={{
                    backgroundColor:
                      qrBackgroundStyle === "full"
                        ? qrBackgroundColor
                        : "transparent",
                    border:
                      qrBorderWidth > 0
                        ? `${qrBorderWidth}px solid ${qrBorderColor}`
                        : "none",
                    padding: `${padding}px`,
                  }}
                >
                  {/* Top Text */}
                  {(textPosition === "top" || textPosition === "both") && (
                    <div className="text-center mb-4">
                      {showDinverLogo && !customLogoUrl && (
                        <h4
                          className="text-xl font-bold mb-1"
                          style={{ color: qrTextColor }}
                        >
                          Dinver
                        </h4>
                      )}
                      {showDinverLogo && customLogoUrl && (
                        <img
                          src={customLogoUrl}
                          alt="Custom Logo"
                          className="h-8 mb-1 mx-auto"
                        />
                      )}
                      {showRestaurantName && (
                        <p
                          className="text-sm opacity-75"
                          style={{ color: qrTextColor }}
                        >
                          {currentRestaurant.name}
                        </p>
                      )}
                    </div>
                  )}

                  {/* QR Code */}
                  <div
                    style={{
                      backgroundColor:
                        qrBackgroundStyle === "qr_only"
                          ? qrBackgroundColor
                          : "transparent",
                      padding: qrBackgroundStyle === "qr_only" ? "8px" : "0",
                      borderRadius:
                        qrBackgroundStyle === "qr_only" ? "8px" : "0",
                    }}
                  >
                    <QRCodeSVG
                      value={menuUrl}
                      fgColor={qrTextColor}
                      bgColor={
                        qrBackgroundStyle === "qr_only"
                          ? qrBackgroundColor
                          : "transparent"
                      }
                      size={qrSize}
                      level={errorCorrection as any}
                    />
                  </div>

                  {/* Bottom Text */}
                  {(textPosition === "bottom" || textPosition === "both") && (
                    <div className="text-center mt-4">
                      {showDinverLogo && !customLogoUrl && (
                        <h4
                          className="text-xl font-bold mb-1"
                          style={{ color: qrTextColor }}
                        >
                          Dinver
                        </h4>
                      )}
                      {showDinverLogo && customLogoUrl && (
                        <img
                          src={customLogoUrl}
                          alt="Custom Logo"
                          className="h-8 mb-1 mx-auto"
                        />
                      )}
                      {showRestaurantName && (
                        <p
                          className="text-sm opacity-75"
                          style={{ color: qrTextColor }}
                        >
                          {currentRestaurant.name}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Scan Text */}
                  {showScanText && (
                    <div className="text-center mt-4">
                      <p
                        className="text-xs opacity-75"
                        style={{ color: qrTextColor }}
                      >
                        {customText}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 mb-2">
                  {t("menu_url_label")}
                </p>
                <p className="text-xs text-gray-500 break-all bg-gray-50 p-2 rounded">
                  {menuUrl}
                </p>
              </div>

              {/* Plan Info */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  {t("current_plan_label")}{" "}
                  {isPremium ? t("premium_plan") : t("basic_plan")}
                </h4>
                <p className="text-xs text-gray-600">
                  {isPremium
                    ? t("access_all_advanced_options")
                    : t("upgrade_for_advanced_options")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRGenerator;
