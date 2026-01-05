import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "react-hot-toast";
import {
  QrCodeIcon,
  SparklesIcon,
  LockClosedIcon,
  EyeIcon,
  AdjustmentsHorizontalIcon,
  SwatchIcon,
} from "@heroicons/react/24/outline";
import {
  sendQRPrintRequest,
  getQRPrintRequests,
} from "../services/restaurantService";

const QRGenerator = () => {
  const { t } = useTranslation();
  // Prvo dohvati currentRestaurant i ponudi offer
  const currentRestaurant = JSON.parse(
    localStorage.getItem("currentRestaurant") || "{}"
  );
  const restaurantOffer = currentRestaurant.offer;
  const isPremiumDefault =
    restaurantOffer === "premium" || restaurantOffer === "enterprise";
  const [isPremium] = useState(isPremiumDefault);

  // Basic QR states
  const [qrTextColor, setQrTextColor] = useState("#000000");
  const [qrBackgroundColor, setQrBackgroundColor] = useState("#FFFFFF");
  const [qrBorderColor, setQrBorderColor] = useState("#E5E7EB");
  const [qrBorderWidth, setQrBorderWidth] = useState(1);

  // Advanced QR options
  const [showDinverLogo, setShowDinverLogo] = useState(true);
  const [showRestaurantName, setShowRestaurantName] = useState(true);
  const [showScanText, setShowScanText] = useState(true);
  const [textPosition, setTextPosition] = useState("top");
  const [padding, setPadding] = useState(24);
  const [selectedPreset, setSelectedPreset] = useState("classic");

  // Premium features
  const [customText, setCustomText] = useState(
    t("scan_for_e_menu_placeholder")
  );
  const [errorCorrection, setErrorCorrection] = useState("M"); // L, M, Q, H

  const [quantity, setQuantity] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requests, setRequests] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const restaurantSlug = currentRestaurant.slug;
  const menuUrl = currentRestaurant.subdomain
    ? `https://${currentRestaurant.subdomain}.dinver.eu/menu?src=qr`
    : `https://dinver.eu/restaurants/${restaurantSlug}/menu?src=qr`;

  // Ensure Dinver logo is always shown for Basic users
  useEffect(() => {
    if (!isPremium && !showDinverLogo) {
      setShowDinverLogo(true);
    }
  }, [isPremium, showDinverLogo]);

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
        setQrBorderWidth(0);
        setPadding(24);
        break;
      case "classic":
        setShowDinverLogo(true);
        setShowRestaurantName(true);
        setShowScanText(true);
        setTextPosition("top");
        setQrBorderWidth(1);
        setPadding(24);
        setQrTextColor("#000000");
        setQrBackgroundColor("#FFFFFF");
        setQrBorderColor("#E5E7EB");
        break;
      case "elegant":
        setShowDinverLogo(true);
        setShowRestaurantName(true);
        setShowScanText(false);
        setTextPosition("both");
        setQrBorderWidth(0);
        setPadding(32);
        setQrTextColor("#1F2937");
        setQrBackgroundColor("#FFFFFF");
        setQrBorderColor("#E5E7EB");
        break;
      case "bold":
        setShowDinverLogo(true);
        setShowRestaurantName(true);
        setShowScanText(true);
        setTextPosition("top");
        setQrBorderWidth(4);
        setPadding(24);
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
        setQrBorderWidth(0);
        setPadding(32);
        setQrTextColor("#1F2937");
        setQrBackgroundColor("#FFFFFF");
        setQrBorderColor("#E5E7EB");
        setErrorCorrection("H");
        break;
    }
  };

  // 2. Funkcija za slanje zahtjeva
  const handleSendRequest = async () => {
    // Validacija quantity
    const parsedQuantity = parseInt(quantity, 10);
    if (isNaN(parsedQuantity) || parsedQuantity < 1) {
      toast.error(
        t("quantity_invalid_error") ||
          "Unesite ispravan broj komada (najmanje 1)"
      );
      return;
    }
    if (isPremium && customText.length > 30) {
      toast.error(
        t("custom_text_too_long") || "Tekst može imati najviše 30 znakova"
      );
      return;
    }
    setIsSubmitting(true);
    try {
      await sendQRPrintRequest(currentRestaurant.id, {
        showDinverLogo,
        showRestaurantName,
        showScanText,
        textPosition,
        qrTextColor,
        qrBackgroundColor,
        qrBorderColor,
        qrBorderWidth,
        padding,
        quantity: parsedQuantity,
        customText,
      });
      toast.success(t("qr_request_sent_success"));
      setQuantity("1");
      fetchRequests();
    } catch (e) {
      toast.error(t("qr_request_sent_error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Dohvati zahtjeve na mount
  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line
  }, []);

  async function fetchRequests() {
    if (!currentRestaurant.id) return;
    const data = await getQRPrintRequests(currentRestaurant.id);
    setRequests(data);
  }

  // 4. Funkcija za kopiranje postavki iz zahtjeva
  const copyRequest = (req: any) => {
    setShowDinverLogo(req.showDinverLogo);
    setShowRestaurantName(req.showRestaurantName);
    setShowScanText(req.showScanText);
    setTextPosition(req.textPosition);
    setQrTextColor(req.qrTextColor);
    setQrBackgroundColor(req.qrBackgroundColor);
    setQrBorderColor(req.qrBorderColor);
    setQrBorderWidth(req.qrBorderWidth);
    setPadding(req.padding);
    setQuantity(req.quantity);
    setCustomText(req.customText || t("scan_for_e_menu_placeholder"));
    toast.success(t("qr_request_copied"));
  };

  const LockedFeature = ({ children }: { children: React.ReactNode }) => (
    <div className="relative opacity-50">
      {children}
      <div className="absolute inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center rounded-lg">
        <LockClosedIcon className="w-6 h-6 text-gray-500" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
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

            {/* Prikaz plana bez mogućnosti promjene */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{t("plan_label")}</span>
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
                    <div className="relative flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
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
                      <SparklesIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-600" />
                    </div>
                  ) : (
                    <LockedFeature>
                      <div className="flex items-center p-3 border border-gray-200 rounded-lg cursor-not-allowed relative">
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
                        <SparklesIcon className="absolute top-2 right-2 w-4 h-4 text-purple-600" />
                      </div>
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

                  {/* Removed Custom Logo Upload */}
                  {/* Removed Custom Text */}
                </div>
                {/* Custom Text za Premium korisnika */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("customize_text_label")}
                  </label>
                  <div className="relative h-full flex items-center">
                    <input
                      type="text"
                      value={
                        isPremium
                          ? customText
                          : t("scan_for_e_menu_placeholder")
                      }
                      maxLength={30}
                      onChange={
                        isPremium
                          ? (e) => setCustomText(e.target.value)
                          : undefined
                      }
                      placeholder={t("scan_for_e_menu_placeholder")}
                      disabled={!isPremium}
                      className={`w-full p-2 pr-8 border ${
                        isPremium
                          ? "border-gray-300"
                          : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                      } rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    />
                    <SparklesIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-600 pointer-events-none" />
                  </div>
                  {isPremium && (
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      {customText.length}/30
                    </div>
                  )}
                </div>
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

                  {/* Removed Background Style Select */}
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
                  {/* Ukloni slider za spacing i border, zamijeni s radio/select za stilove */}
                  <div className="mb-8">
                    <h4 className="text-sm font-medium text-gray-700 mb-4">
                      Spacing (Padding)
                    </h4>
                    <div className="flex gap-4">
                      <label
                        className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer ${
                          padding === 16
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name="padding"
                          value={16}
                          checked={padding === 16}
                          onChange={() => setPadding(16)}
                        />
                        <span>12px</span>
                      </label>
                      <label
                        className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer ${
                          padding === 24
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name="padding"
                          value={24}
                          checked={padding === 24}
                          onChange={() => setPadding(24)}
                        />
                        <span>24px</span>
                      </label>
                      <label
                        className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer ${
                          padding === 32
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name="padding"
                          value={32}
                          checked={padding === 32}
                          onChange={() => setPadding(32)}
                        />
                        <span>32px</span>
                      </label>
                    </div>
                  </div>

                  <div className="mb-8">
                    <h4 className="text-sm font-medium text-gray-700 mb-4">
                      Border Width
                    </h4>
                    <div className="flex gap-4">
                      <label
                        className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer ${
                          qrBorderWidth === 0
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name="border-width"
                          value={0}
                          checked={qrBorderWidth === 0}
                          onChange={() => setQrBorderWidth(0)}
                        />
                        <span>0px</span>
                      </label>
                      <label
                        className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer ${
                          qrBorderWidth === 1
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name="border-width"
                          value={1}
                          checked={qrBorderWidth === 1}
                          onChange={() => setQrBorderWidth(1)}
                        />
                        <span>1px</span>
                      </label>
                      <label
                        className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer ${
                          qrBorderWidth === 4
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name="border-width"
                          value={4}
                          checked={qrBorderWidth === 4}
                          onChange={() => setQrBorderWidth(4)}
                        />
                        <span>4px</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <div className="flex items-center gap-4 mt-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {t("quantity_label")}
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="ml-2 w-20 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </label>
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <QrCodeIcon className="w-4 h-4" />
                    {isSubmitting
                      ? t("sending_text")
                      : t("send_request_button")}
                  </button>
                </div>
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
                    backgroundColor: qrBackgroundColor, // Always use background color for preview
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
                      {showDinverLogo && (
                        <h4
                          className="text-xl font-bold mb-1"
                          style={{ color: qrTextColor }}
                        >
                          Dinver
                        </h4>
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
                      backgroundColor: "transparent", // Always transparent for preview
                      padding: "0", // No padding for preview
                      borderRadius: "0", // No border radius for preview
                    }}
                  >
                    <QRCodeSVG
                      value={menuUrl}
                      fgColor={qrTextColor}
                      bgColor={
                        "transparent" // Always transparent for preview
                      }
                      size={200} // Fixed size for preview
                      level={errorCorrection as any}
                    />
                  </div>

                  {/* Bottom Text */}
                  {(textPosition === "bottom" || textPosition === "both") && (
                    <div className="text-center mt-4">
                      {showDinverLogo && (
                        <h4
                          className="text-xl font-bold mb-1"
                          style={{ color: qrTextColor }}
                        >
                          Dinver
                        </h4>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-0 mb-0 pb-10">
        <h4 className="text-base font-semibold text-gray-800 mb-4">
          {t("previous_requests_label")}
        </h4>
        <div className="rounded-lg shadow-sm border border-gray-200 bg-white p-6">
          <table className="min-w-full text-sm text-gray-700">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-2 px-3 font-medium text-center border-b">
                  {t("date_label")}
                </th>
                <th className="py-2 px-3 font-medium text-center border-b">
                  {t("quantity_label")}
                </th>
                <th className="py-2 px-3 font-medium text-center border-b">
                  {t("status_label")}
                </th>
                <th className="py-2 px-3 font-medium text-center border-b">
                  {t("actions_label")}
                </th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-gray-400 italic"
                  >
                    {t("no_requests_yet")}
                  </td>
                </tr>
              ) : (
                requests.map((req: any) => (
                  <tr
                    key={req.id}
                    className="hover:bg-gray-50 transition-colors border-b last:border-b-0"
                  >
                    <td className="py-2 px-3 text-center align-middle">
                      {new Date(req.createdAt).toLocaleString("hr-HR")}
                    </td>
                    <td className="py-2 px-3 text-center align-middle">
                      {req.quantity}
                    </td>
                    <td className="py-2 px-3 text-center align-middle">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          req.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : req.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : req.status === "printed"
                            ? "bg-blue-100 text-blue-800"
                            : req.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {t(req.status)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center align-middle">
                      <button
                        onClick={() => copyRequest(req)}
                        className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-xs border border-gray-200"
                      >
                        {t("copy_request_button")}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL ZA POTVRDU SLANJA ZAHTJEVA */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <div className="flex items-center mb-4 gap-2">
              <QrCodeIcon className="w-8 h-8 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold">
                  {t("send_request_button")}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {t("confirm_send_qr_request", { n: quantity })}
                </p>
              </div>
            </div>
            <div className="h-line mb-4"></div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="secondary-button"
              >
                {t("cancel")}
              </button>
              <button
                onClick={async () => {
                  setShowConfirmModal(false);
                  await handleSendRequest();
                }}
                className="primary-button"
                disabled={isSubmitting}
              >
                {t("send_request_button")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRGenerator;
