/** Business category catalog (data-driven: new categories need no code change). */
export interface BusinessCategory {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessSubcategory extends BusinessCategory {
  categoryId: string;
}

export interface CategoryTreeNode extends BusinessCategory {
  subcategories: BusinessSubcategory[];
}
