import { useMemo } from "react";
import {
  createHeroDiscoveryViewModel,
  HeroDiscovery,
} from "./modules/mfe-hero-discovery";

type Props = {
  locale: "en" | "vi";
  isAuthenticated: boolean;
};

type Localized = {
  en: string;
  vi: string;
};

type Destination = {
  imageUrl: string;
  imageAlt: Localized;
  title: Localized;
  sceneTitle: Localized;
  address: Localized;
  featureArticles: Array<{
    id: string;
    title: Localized;
    kicker: Localized;
    imageUrl: string;
    heroImageUrl: string;
    panoramaUrl: string;
    imageAlt: Localized;
  }>;
  rooms: Array<{
    id: string;
    name: Localized;
    panoramaUrl: string;
    imageUrl: string;
    imageAlt: Localized;
    thumbnailUrl: string;
    summary: Localized;
    hotspots: Array<{
      id: string;
      label: Localized;
      longitude: number;
      latitude: number;
      targetRoomId: string;
    }>;
  }>;
  comments: Array<{
    id: string;
    author: string;
    role: Localized;
    rating: number;
    body: Localized;
  }>;
};

const text = (value: Localized, locale: "en" | "vi") => value[locale];

const PH = (name: string) =>
  `https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/${name}.jpg`;

const MODERN = {
  lounge: PH("wooden_lounge"),
  bedroom: PH("hotel_room"),
  bathroom: PH("modern_bathroom"),
  study: PH("blinds"),
  terrace: PH("aft_lounge"),
};

const HERO_PANORAMA = PH("secluded_beach");

const THUMB = {
  lounge: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=160&q=75",
  bedroom: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=160&q=75",
  bathroom: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=160&q=75",
  study: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=160&q=75",
  terrace: "https://images.unsplash.com/photo-1600566753375-7a3b0e52c76c?w=160&q=75",
};

const LABELS = {
  vi: {
    discoverySearchLabel: "Tìm điểm đến",
    discoverySearchPlaceholder: "Tìm Phú Quốc, Sa Pa, Hội An...",
    discoverySearchActionLabel: "Tìm kiếm",
    discoveryQuickFiltersLabel: "Gợi ý nhanh",
    discoveryFilters: ["Mùa này", "2 ngày", "Gia đình", "Biển", "Núi"],
    featureActionLabel: "Xem thêm",
    featureVrBadgeLabel: "360° VR",
    detailBackLabel: "Quay lại điểm đến",
    detailCurrentViewLabel: "Góc nhìn hiện tại",
    detailReviewLabel: "Nhận xét du khách",
    detailReviewSummary: "4.8/5 · 326 đánh giá",
    detailScenePickerLabel: "Chọn góc nhìn",
    detailPanelAriaLabel: "Thông tin điểm đến",
    detailViewerHint: "Kéo để xoay 360° • cuộn để phóng to",
    detailLoadingLabel: "Đang tải không gian 360°",
    detailErrorLabel: "Không thể tải không gian 360°",
    detailAutoRotateLabel: "Tự xoay",
    detailExpandLabel: "Mở rộng chi tiết",
    detailCollapseLabel: "Thu gọn chi tiết",
    detailEnterFullscreenLabel: "Mở toàn màn hình",
    detailExitFullscreenLabel: "Thoát toàn màn hình",
    detailVrModeLabel: "Vào chế độ VR",
    detailCommentRatingLabel: "Đánh giá của bạn",
    detailCommentFormLabel: "Bình luận của bạn",
    detailCommentFormPlaceholder: "Chia sẻ cảm nhận sau khi xem không gian 360°...",
    detailCommentFormAction: "Gửi bình luận",
    detailFeedbackShowLabel: "Xem nhận xét & bình luận",
    detailFeedbackHideLabel: "Ẩn nhận xét & bình luận",
    detailCommentAuthorName: "Bạn",
    detailCommentAuthorRole: "Du khách đã đăng nhập",
    detailCommentLoginHint: "Đăng nhập để gửi bình luận và đánh giá về không gian này.",
  },
  en: {
    discoverySearchLabel: "Find a destination",
    discoverySearchPlaceholder: "Search Phu Quoc, Sa Pa, Hoi An...",
    discoverySearchActionLabel: "Search",
    discoveryQuickFiltersLabel: "Quick filters",
    discoveryFilters: ["This season", "2 days", "Family", "Beach", "Mountain"],
    featureActionLabel: "View more",
    featureVrBadgeLabel: "360° VR",
    detailBackLabel: "Back to destinations",
    detailCurrentViewLabel: "Current viewpoint",
    detailReviewLabel: "Traveler reviews",
    detailReviewSummary: "4.8/5 · 326 reviews",
    detailScenePickerLabel: "Choose viewpoint",
    detailPanelAriaLabel: "Destination details",
    detailViewerHint: "Drag to look around in 360° • scroll to zoom",
    detailLoadingLabel: "Loading 360° space",
    detailErrorLabel: "Unable to load the 360° scene",
    detailAutoRotateLabel: "Auto rotate",
    detailExpandLabel: "Expand details",
    detailCollapseLabel: "Collapse details",
    detailEnterFullscreenLabel: "Enter fullscreen",
    detailExitFullscreenLabel: "Exit fullscreen",
    detailVrModeLabel: "Enter VR mode",
    detailCommentRatingLabel: "Your rating",
    detailCommentFormLabel: "Your comment",
    detailCommentFormPlaceholder: "Share what you noticed after viewing the 360° space...",
    detailCommentFormAction: "Post comment",
    detailFeedbackShowLabel: "Show reviews and comments",
    detailFeedbackHideLabel: "Hide reviews and comments",
    detailCommentAuthorName: "You",
    detailCommentAuthorRole: "Signed-in traveler",
    detailCommentLoginHint: "Sign in to post a comment and rating for this space.",
  },
} as const;

const DESTINATIONS: Destination[] = [
  {
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=2200&q=90&auto=format&fit=crop",
    imageAlt: {
      vi: "Phú Quốc beach panorama preview",
      en: "Phu Quoc beach panorama preview",
    },
    title: {
      vi: "Resort Biển Phú Quốc",
      en: "Phu Quoc Beach Resort",
    },
    sceneTitle: {
      vi: "Resort Biển Phú Quốc",
      en: "Phu Quoc Beach Resort",
    },
    address: {
      vi: "Bãi Trường, Phú Quốc, Kiên Giang",
      en: "Bai Truong, Phu Quoc, Kien Giang",
    },
    featureArticles: [
      {
        id: "article-sunset",
        title: { vi: "Hoàng hôn Bãi Trường", en: "Bai Truong Sunset" },
        kicker: { vi: "Cẩm nang", en: "Guide" },
        imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=420&q=82&auto=format&fit=crop",
        heroImageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=2200&q=90&auto=format&fit=crop",
        panoramaUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=2200&q=90&auto=format&fit=crop",
        imageAlt: { vi: "Hoàng hôn trên bãi biển Phú Quốc", en: "Sunset over a Phu Quoc beach" },
      },
      {
        id: "article-island-hop",
        title: { vi: "Lịch trình đảo Nam", en: "Southern Island Route" },
        kicker: { vi: "Trải nghiệm", en: "Experience" },
        imageUrl: "https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=420&q=82&auto=format&fit=crop",
        heroImageUrl: "https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=2200&q=90&auto=format&fit=crop",
        panoramaUrl: "https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=2200&q=90&auto=format&fit=crop",
        imageAlt: { vi: "Biển xanh và thuyền du lịch đảo", en: "Blue sea and island tour boat" },
      },
      {
        id: "article-coral",
        title: { vi: "Lặn ngắm san hô", en: "Coral Snorkeling" },
        kicker: { vi: "Hoạt động", en: "Activity" },
        imageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=420&q=82&auto=format&fit=crop",
        heroImageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=2200&q=90&auto=format&fit=crop",
        panoramaUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=2200&q=90&auto=format&fit=crop",
        imageAlt: { vi: "Mặt nước biển xanh cho hoạt động lặn ngắm san hô", en: "Blue water for coral snorkeling" },
      },
      {
        id: "article-seafood",
        title: { vi: "Ăn tối ven biển", en: "Beachfront Dinner" },
        kicker: { vi: "Ẩm thực", en: "Dining" },
        imageUrl: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=420&q=82&auto=format&fit=crop",
        heroImageUrl: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=2200&q=90&auto=format&fit=crop",
        panoramaUrl: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=2200&q=90&auto=format&fit=crop",
        imageAlt: { vi: "Bàn ăn tối cạnh biển", en: "Dinner table near the coast" },
      },
      {
        id: "article-resort",
        title: { vi: "Nghỉ dưỡng 3 ngày", en: "Three-Day Resort Stay" },
        kicker: { vi: "Lịch trình", en: "Itinerary" },
        imageUrl: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=420&q=82&auto=format&fit=crop",
        heroImageUrl: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=2200&q=90&auto=format&fit=crop",
        panoramaUrl: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=2200&q=90&auto=format&fit=crop",
        imageAlt: { vi: "Resort biển với hồ bơi và hàng dừa", en: "Beach resort with pool and palm trees" },
      },
    ],
    rooms: [
      {
        id: "p1-lounge",
        name: {
          vi: "Sảnh nghỉ",
          en: "Lounge",
        },
        panoramaUrl: MODERN.lounge,
        imageUrl: THUMB.lounge,
        imageAlt: {
          vi: "Sảnh nghỉ thoáng đãng trong resort ven biển Phú Quốc",
          en: "Airy lounge inside the Phu Quoc beachfront resort",
        },
        thumbnailUrl: THUMB.lounge,
        summary: {
          vi: "Khu nghỉ dưỡng ven biển với sảnh nghỉ thoáng đãng, mở ra nhịp nghỉ dưỡng nhẹ nhàng trước khi chuyển sang suite, spa và sân ngắm hoàng hôn.",
          en: "A beachfront resort lounge with an airy first impression before moving into the suite, spa, and sunset terrace viewpoints.",
        },
        hotspots: [
          { id: "h1", label: { vi: "Phòng Suite →", en: "Suite Room →" }, longitude: 110, latitude: 0, targetRoomId: "p1-bedroom" },
          { id: "h2", label: { vi: "Góc thư giãn →", en: "Relaxation Corner →" }, longitude: -60, latitude: 0, targetRoomId: "p1-study" },
        ],
      },
      {
        id: "p1-bedroom",
        name: {
          vi: "Phòng Suite",
          en: "Suite Room",
        },
        panoramaUrl: MODERN.bedroom,
        imageUrl: THUMB.bedroom,
        imageAlt: {
          vi: "Phòng suite hướng biển tại resort Phú Quốc",
          en: "Sea-view suite at the Phu Quoc resort",
        },
        thumbnailUrl: THUMB.bedroom,
        summary: {
          vi: "Phòng suite hướng biển nối mạch từ sảnh nghỉ, tập trung vào cảm giác nghỉ dưỡng cao cấp và ánh sáng dịu bên bờ Bãi Trường.",
          en: "A sea-view suite continuing the resort flow with premium stay cues and soft Bai Truong coastal light.",
        },
        hotspots: [
          { id: "h3", label: { vi: "← Sảnh nghỉ", en: "← Lounge" }, longitude: -70, latitude: 0, targetRoomId: "p1-lounge" },
          { id: "h4", label: { vi: "Khu Spa →", en: "Spa Zone →" }, longitude: 90, latitude: 0, targetRoomId: "p1-bathroom" },
        ],
      },
      {
        id: "p1-bathroom",
        name: {
          vi: "Khu Spa",
          en: "Spa Zone",
        },
        panoramaUrl: MODERN.bathroom,
        imageUrl: THUMB.bathroom,
        imageAlt: {
          vi: "Khu spa thư giãn trong resort ven biển",
          en: "Relaxing spa zone inside the beachfront resort",
        },
        thumbnailUrl: THUMB.bathroom,
        summary: {
          vi: "Khu spa giữ đúng mood nghỉ dưỡng Phú Quốc với ánh sáng sạch, vật liệu dịu và cảm giác thư giãn sau phòng suite.",
          en: "The spa keeps the Phu Quoc resort mood with clean light, soft materials, and a calm transition after the suite.",
        },
        hotspots: [
          { id: "h5", label: { vi: "← Phòng Suite", en: "← Suite Room" }, longitude: -90, latitude: 0, targetRoomId: "p1-bedroom" },
        ],
      },
      {
        id: "p1-study",
        name: {
          vi: "Góc thư giãn",
          en: "Relaxation Corner",
        },
        panoramaUrl: MODERN.study,
        imageUrl: THUMB.study,
        imageAlt: {
          vi: "Góc thư giãn nối giữa sảnh nghỉ và sân ngắm cảnh",
          en: "Relaxation corner between the lounge and terrace viewpoint",
        },
        thumbnailUrl: THUMB.study,
        summary: {
          vi: "Góc thư giãn cho nhóm nhỏ, giữ mạch nghỉ dưỡng ven biển trước khi mở ra sân ngắm hoàng hôn.",
          en: "A small-group relaxation viewpoint that keeps the beachfront resort rhythm before opening toward the sunset terrace.",
        },
        hotspots: [
          { id: "h6", label: { vi: "← Sảnh nghỉ", en: "← Lounge" }, longitude: 60, latitude: 0, targetRoomId: "p1-lounge" },
          { id: "h7", label: { vi: "Sân ngắm cảnh →", en: "Terrace View →" }, longitude: -120, latitude: 0, targetRoomId: "p1-terrace" },
        ],
      },
      {
        id: "p1-terrace",
        name: {
          vi: "Sân ngắm cảnh",
          en: "Terrace View",
        },
        panoramaUrl: MODERN.terrace,
        imageUrl: THUMB.terrace,
        imageAlt: {
          vi: "Sân ngắm hoàng hôn hướng biển Phú Quốc",
          en: "Sunset terrace facing the Phu Quoc sea",
        },
        thumbnailUrl: THUMB.terrace,
        summary: {
          vi: "Sân ngắm cảnh là điểm kết của tuyến Phú Quốc: mở ra cảm giác hoàng hôn ven biển, đúng mô tả sân ngắm hoàng hôn trong dữ liệu gốc.",
          en: "The terrace closes the Phu Quoc route with a beachfront sunset viewpoint matching the original destination data.",
        },
        hotspots: [
          { id: "h8", label: { vi: "← Góc thư giãn", en: "← Relaxation Corner" }, longitude: 120, latitude: 0, targetRoomId: "p1-study" },
        ],
      },
    ],
    comments: [
      {
        id: "comment-1",
        author: "Minh Trần",
        role: {
          vi: "Local curator",
          en: "Local curator",
        },
        rating: 5,
        body: {
          vi: "Bãi Trường cho cảm giác rất thoáng và dễ định hướng. Góc nhìn 360° mở ra đủ rộng để xem bố cục resort trước khi đặt lịch trải nghiệm.",
          en: "Bai Truong feels open and easy to read. The 360° viewpoint is wide enough to understand the resort layout before booking a visit.",
        },
      },
      {
        id: "comment-2",
        author: "Linh Phạm",
        role: {
          vi: "Family traveler",
          en: "Family traveler",
        },
        rating: 4,
        body: {
          vi: "Mình xem tour trước chuyến đi và thấy phần sảnh, lối đi và ánh sáng thể hiện khá rõ. Nếu đi vào Tháng 11 - 4 thì trải nghiệm thực tế rất hợp để chụp hình và nghỉ dưỡng.",
          en: "I checked the tour before my trip and the lounge, walkways, and lighting were clear. Visiting from November to April feels especially photogenic and relaxing.",
        },
      },
      {
        id: "comment-3",
        author: "An Trần",
        role: {
          vi: "Weekend explorer",
          en: "Weekend explorer",
        },
        rating: 5,
        body: {
          vi: "Điểm mình thích là có thể xem nhanh nhiều viewpoint rồi đọc nhận xét ngay trong cùng một panel. Cách trình bày này giúp quyết định nhanh hơn trước khi chuyển sang bước đặt chỗ.",
          en: "What I like most is being able to scan multiple viewpoints and read feedback in the same panel. It speeds up the decision before booking.",
        },
      },
    ],
  },
];

export const AppView = ({ locale, isAuthenticated }: Props): JSX.Element => {
  const labels = LABELS[locale];
  const activeDestination = DESTINATIONS[0];

  const heroVm = useMemo(
    () => createHeroDiscoveryViewModel({
      discoverySearchLabel: labels.discoverySearchLabel,
      discoverySearchPlaceholder: labels.discoverySearchPlaceholder,
      discoverySearchActionLabel: labels.discoverySearchActionLabel,
      discoveryQuickFiltersLabel: labels.discoveryQuickFiltersLabel,
      discoveryFilters: [...labels.discoveryFilters],
      featureActionLabel: labels.featureActionLabel,
      featureImageUrl: activeDestination.imageUrl,
      featureImageAlt: text(activeDestination.imageAlt, locale),
      featureVrBadgeLabel: labels.featureVrBadgeLabel,
      featureTitle: text(activeDestination.title, locale),
      featurePanoramaUrl: HERO_PANORAMA,
      featureArticles: activeDestination.featureArticles.map((article) => ({
        id: article.id,
        title: text(article.title, locale),
        kicker: text(article.kicker, locale),
        imageUrl: article.imageUrl,
        heroImageUrl: article.heroImageUrl,
        panoramaUrl: article.panoramaUrl,
        imageAlt: text(article.imageAlt, locale),
      })),
      detailBackLabel: labels.detailBackLabel,
      detailCurrentViewLabel: labels.detailCurrentViewLabel,
      detailReviewLabel: labels.detailReviewLabel,
      detailReviewSummary: labels.detailReviewSummary,
      detailAddress: text(activeDestination.address, locale),
      detailSceneTitle: text(activeDestination.sceneTitle, locale),
      detailScenePickerLabel: labels.detailScenePickerLabel,
      detailPanelAriaLabel: labels.detailPanelAriaLabel,
      detailViewerHint: labels.detailViewerHint,
      detailLoadingLabel: labels.detailLoadingLabel,
      detailErrorLabel: labels.detailErrorLabel,
      detailRooms: activeDestination.rooms.map((room) => ({
        id: room.id,
        name: text(room.name, locale),
        panoramaUrl: room.panoramaUrl,
        imageUrl: room.imageUrl,
        imageAlt: text(room.imageAlt, locale),
        thumbnailUrl: room.thumbnailUrl,
        summary: text(room.summary, locale),
        hotspots: room.hotspots.map((hotspot) => ({
          id: hotspot.id,
          label: text(hotspot.label, locale),
          longitude: hotspot.longitude,
          latitude: hotspot.latitude,
          targetRoomId: hotspot.targetRoomId,
        })),
      })),
      detailComments: activeDestination.comments.map((comment) => ({
        id: comment.id,
        author: comment.author,
        role: text(comment.role, locale),
        rating: comment.rating,
        body: text(comment.body, locale),
      })),
      detailAutoRotateLabel: labels.detailAutoRotateLabel,
      detailExpandLabel: labels.detailExpandLabel,
      detailCollapseLabel: labels.detailCollapseLabel,
      detailEnterFullscreenLabel: labels.detailEnterFullscreenLabel,
      detailExitFullscreenLabel: labels.detailExitFullscreenLabel,
      detailVrModeLabel: labels.detailVrModeLabel,
      detailCommentRatingLabel: labels.detailCommentRatingLabel,
      detailCommentFormLabel: labels.detailCommentFormLabel,
      detailCommentFormPlaceholder: labels.detailCommentFormPlaceholder,
      detailCommentFormAction: labels.detailCommentFormAction,
      detailFeedbackShowLabel: labels.detailFeedbackShowLabel,
      detailFeedbackHideLabel: labels.detailFeedbackHideLabel,
      detailCommentAuthorName: labels.detailCommentAuthorName,
      detailCommentAuthorRole: labels.detailCommentAuthorRole,
    }),
    [activeDestination, labels, locale],
  );

  return (
    <div className="mfe-hero-app">
      <div className="mfe-hero-app__shell">
        <HeroDiscovery vm={heroVm} isAuthenticated={isAuthenticated} commentLoginHint={labels.detailCommentLoginHint} />
      </div>
    </div>
  );
};