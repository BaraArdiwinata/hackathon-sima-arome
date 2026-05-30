'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  Product,
  CreateProductRequest,
  UpdateProductRequest,
  Recipe,
  CreateRecipeRequest,
  UpdateRecipeRequest,
  RawMaterial,
} from '@/types/collections';

const BASE = '/api/items';

// ────────────────────────────────────────────────────────────
// Products hooks
// ────────────────────────────────────────────────────────────

export function usePaginatedProducts(search = '') {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (search) {
        params.set('filter[_or][0][type][_icontains]', search);
        params.set('filter[_or][1][categories][_icontains]', search);
      }
      const res = await fetch(`${BASE}/products?${params}`);
      const json = await res.json();
      setProducts(json.data ?? []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, refetch: fetchProducts };
}

export function useProduct(id: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/products/${id}`);
      const json = await res.json();
      setProduct(json.data ?? null);
    } catch {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  return { product, loading, refetch: fetchProduct };
}

export function useCreateProduct() {
  const [loading, setLoading] = useState(false);

  const create = useCallback(async (data: CreateProductRequest) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading };
}

export function useUpdateProduct() {
  const [loading, setLoading] = useState(false);

  const update = useCallback(async (id: string, data: UpdateProductRequest) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } finally {
      setLoading(false);
    }
  }, []);

  return { update, loading };
}

export function useDeleteProduct() {
  const [loading, setLoading] = useState(false);

  const remove = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await fetch(`${BASE}/products/${id}`, { method: 'DELETE' });
    } finally {
      setLoading(false);
    }
  }, []);

  return { remove, loading };
}

// ────────────────────────────────────────────────────────────
// Recipe hooks
// ────────────────────────────────────────────────────────────

export function useProductRecipes(productId: string) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        'filter[products_id][_eq]': productId,
        limit: '200',
      });
      const res = await fetch(`${BASE}/recipe?${params}`);
      const json = await res.json();
      setRecipes(json.data ?? []);
    } catch {
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  return { recipes, loading, refetch: fetchRecipes };
}

export function useCreateRecipe() {
  const [loading, setLoading] = useState(false);

  const create = useCallback(async (data: CreateRecipeRequest) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading };
}

export function useUpdateRecipe() {
  const [loading, setLoading] = useState(false);

  const update = useCallback(async (id: string, data: UpdateRecipeRequest) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/recipe/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } finally {
      setLoading(false);
    }
  }, []);

  return { update, loading };
}

export function useDeleteRecipe() {
  const [loading, setLoading] = useState(false);

  const remove = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await fetch(`${BASE}/recipe/${id}`, { method: 'DELETE' });
    } finally {
      setLoading(false);
    }
  }, []);

  return { remove, loading };
}

// ────────────────────────────────────────────────────────────
// Shared: Raw Materials (untuk recipe selector)
// ────────────────────────────────────────────────────────────

export function useRawMaterials() {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BASE}/raw_materials?limit=500`);
        const json = await res.json();
        setRawMaterials((json.data ?? []) as RawMaterial[]);
      } catch {
        setRawMaterials([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return { rawMaterials, loading };
}
