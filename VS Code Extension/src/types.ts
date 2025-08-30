export interface HeaderComment {
  purpose: string;
  example: string;
  related_classes: string;
}

export interface AIResponse {
  success: boolean;
  original_content: string;
  header_comment: HeaderComment;
  modified_content: string;
  language: string;
  filename: string;
}
