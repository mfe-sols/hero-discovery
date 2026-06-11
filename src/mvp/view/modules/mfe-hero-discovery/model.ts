export type HeroDiscoveryDetailHotspot = {
  id: string;
  label: string;
  longitude: number;
  latitude: number;
  targetRoomId: string;
};

export type HeroDiscoveryDetailRoom = {
  id: string;
  name: string;
  panoramaUrl: string;
  imageUrl: string;
  imageAlt: string;
  thumbnailUrl: string;
  summary: string;
  hotspots: HeroDiscoveryDetailHotspot[];
};

export type HeroDiscoveryDetailComment = {
  id: string;
  author: string;
  role: string;
  rating: number;
  body: string;
};

export type HeroDiscoveryFeatureArticle = {
  id: string;
  title: string;
  kicker: string;
  imageUrl: string;
  heroImageUrl?: string;
  panoramaUrl?: string;
  imageAlt: string;
};

export type HeroDiscoveryData = {
  featureActionLabel: string;
  featureImageUrl: string;
  featureImageAlt: string;
  featureVrBadgeLabel: string;
  featureTitle: string;
  featurePanoramaUrl: string;
  featureArticles: HeroDiscoveryFeatureArticle[];
  detailBackLabel: string;
  detailCurrentViewLabel: string;
  detailReviewLabel: string;
  detailReviewSummary: string;
  detailAddress: string;
  detailSceneTitle: string;
  detailScenePickerLabel: string;
  detailPanelAriaLabel: string;
  detailViewerHint: string;
  detailLoadingLabel: string;
  detailErrorLabel: string;
  detailRooms: HeroDiscoveryDetailRoom[];
  detailComments: HeroDiscoveryDetailComment[];
  detailAutoRotateLabel: string;
  detailExpandLabel: string;
  detailCollapseLabel: string;
  detailEnterFullscreenLabel: string;
  detailExitFullscreenLabel: string;
  detailCommentRatingLabel: string;
  detailCommentFormLabel: string;
  detailCommentFormPlaceholder: string;
  detailCommentFormAction: string;
  detailCommentAuthorName: string;
  detailCommentAuthorRole: string;
};

export type HeroDiscoveryViewModel = HeroDiscoveryData;
