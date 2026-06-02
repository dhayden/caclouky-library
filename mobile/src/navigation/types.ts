export type CatalogStackParamList = {
  BookList: undefined;
  BookDetail: { id: number };
};

export type SermonStackParamList = {
  SermonSearch: undefined;
  PdfViewer: { fileName: string; page: number; title: string; highlight?: string };
};

export type AdminStackParamList = {
  AdminDashboard: undefined;
  AdminCheckouts: undefined;
  AdminReservations: undefined;
  AdminMembers: undefined;
};
