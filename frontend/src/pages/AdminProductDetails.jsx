import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag,
  ChevronLeft,
  Plus,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X,
  Package,
  Layers,
  Edit2,
  Calendar,
  Clock,
} from 'lucide-react';
import { adminService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const formatCurrency = (val) => {
  const num = Number(val);
  if (isNaN(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN')}`;
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

export default function AdminProductDetails() {
  const { productId } = useParams();
  const navigate = useNavigate();

  // Authentication check
  const [authError] = useState(() => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user?.role && user.role !== 'admin') {
        return '403 Forbidden: Administrator privileges required to access Admin Merchandise Management.';
      }
    } catch {
      // rely on backend auth
    }
    return '';
  });

  // Product & Variant state
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Banner alert / Toast
  const [bannerAlert, setBannerAlert] = useState(null);

  const showToast = (message, type = 'success') => {
    setBannerAlert({ message, type });
    setTimeout(() => {
      setBannerAlert((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Edit Product Modal State
  const [editProductOpen, setEditProductOpen] = useState(false);
  const [editProductSubmitting, setEditProductSubmitting] = useState(false);
  const [editProductError, setEditProductError] = useState('');
  const [editProductForm, setEditProductForm] = useState({
    name: '',
    description: '',
    basePrice: '',
    image: '',
    isMemberAvailable: true,
  });

  // Add Variant Modal State
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [variantSubmitting, setVariantSubmitting] = useState(false);
  const [variantError, setVariantError] = useState('');
  const [variantForm, setVariantForm] = useState({
    name: '',
    price: '',
    stock: '',
  });

  // Update Inventory Modal State (SET semantics)
  const [inventoryModal, setInventoryModal] = useState({
    open: false,
    variantId: null,
    variantName: '',
    currentStock: 0,
    newStock: '',
    submitting: false,
    error: '',
  });

  // Load Product Details from Backend
  const loadProduct = useCallback(async () => {
    if (authError || !productId) return;

    setLoading(true);
    setFetchError('');
    try {
      const response = await adminService.getAdminProduct(productId);
      if (response.data?.success) {
        const data = response.data.data?.product || response.data.data;
        setProduct(data);
        setEditProductForm({
          name: data.name || '',
          description: data.description || '',
          basePrice: data.basePrice !== undefined ? String(data.basePrice) : '',
          image: data.image || '',
          isMemberAvailable: data.isMemberAvailable ?? (data.status === 'ACTIVE'),
        });
      } else {
        setFetchError('Unexpected response from server.');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setFetchError('404: Product not found in catalog.');
      } else if (err.response?.status === 403) {
        setFetchError('403 Forbidden: You do not have permission to view merchandise details.');
      } else {
        setFetchError(err.response?.data?.message || err.message || 'Unable to load product details.');
      }
    } finally {
      setLoading(false);
    }
  }, [authError, productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  // Handle Edit Product Submit
  const handleEditProductSubmit = async (e) => {
    e.preventDefault();
    if (!editProductForm.name.trim()) {
      setEditProductError('Product name is required.');
      return;
    }
    if (!editProductForm.description.trim()) {
      setEditProductError('Description is required.');
      return;
    }

    let parsedPrice = 0;
    if (editProductForm.basePrice !== '') {
      parsedPrice = Number(editProductForm.basePrice);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        setEditProductError('Base price must be a valid non-negative number.');
        return;
      }
    }

    setEditProductSubmitting(true);
    setEditProductError('');

    try {
      const payload = {
        name: editProductForm.name.trim(),
        description: editProductForm.description.trim(),
        basePrice: parsedPrice,
        image: editProductForm.image.trim() || null,
        isMemberAvailable: editProductForm.isMemberAvailable,
      };

      await adminService.updateAdminProduct(productId, payload);
      showToast('Product details updated successfully.');
      setEditProductOpen(false);
      loadProduct();
    } catch (err) {
      setEditProductError(
        err.response?.data?.message ||
          err.response?.data?.error?.message ||
          'Failed to update product details.'
      );
    } finally {
      setEditProductSubmitting(false);
    }
  };

  // Handle Add Variant Submit
  const handleVariantSubmit = async (e) => {
    e.preventDefault();
    setVariantError('');

    const { name, price, stock } = variantForm;
    if (!name.trim()) {
      setVariantError('Variant name or size is required.');
      return;
    }
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setVariantError('Price must be a valid number >= 0.');
      return;
    }
    const numStock = Number(stock);
    if (!Number.isInteger(numStock) || numStock < 0) {
      setVariantError('Stock must be an integer >= 0.');
      return;
    }

    setVariantSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        size: name.trim(),
        price: numPrice,
        stock: numStock,
        isActive: true,
      };

      const res = await adminService.createAdminProductVariant(productId, payload);
      if (res.data?.success) {
        showToast(`Variant "${name}" created with initial stock of ${numStock} units.`);
        setVariantModalOpen(false);
        setVariantForm({ name: '', price: '', stock: '' });
        loadProduct();
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setVariantError(
          err.response?.data?.message || 'A variant with this name/size already exists for this product.'
        );
      } else {
        setVariantError(err.response?.data?.message || 'Failed to create product variant.');
      }
    } finally {
      setVariantSubmitting(false);
    }
  };

  // Open Update Inventory Modal
  const openInventoryModal = (variant) => {
    const vId = variant.variantId || variant.id;
    const vName = variant.size || variant.name || 'Standard';
    const currentStock = Number(variant.stock !== undefined ? variant.stock : (variant.availableQuantity ?? 0));

    setInventoryModal({
      open: true,
      variantId: vId,
      variantName: vName,
      currentStock,
      newStock: String(currentStock),
      submitting: false,
      error: '',
    });
  };

  // Handle Update Inventory Submit (SET Semantics)
  const handleInventorySubmit = async (e) => {
    e.preventDefault();
    setInventoryModal((prev) => ({ ...prev, error: '' }));

    const stockNum = Number(inventoryModal.newStock);
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      setInventoryModal((prev) => ({
        ...prev,
        error: 'Stock must be a non-negative integer (>= 0).',
      }));
      return;
    }

    setInventoryModal((prev) => ({ ...prev, submitting: true }));
    try {
      const res = await adminService.updateAdminInventory(
        productId,
        inventoryModal.variantId,
        stockNum
      );
      if (res.data?.success) {
        showToast(
          `Inventory for variant "${inventoryModal.variantName}" updated to ${stockNum} units.`
        );
        setInventoryModal((prev) => ({ ...prev, open: false }));
        loadProduct();
      }
    } catch (err) {
      setInventoryModal((prev) => ({
        ...prev,
        error: err.response?.data?.message || 'Failed to update inventory. Please try again.',
      }));
    } finally {
      setInventoryModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-16 text-center shadow-sm">
        <LoadingSpinner className="mx-auto h-8 w-8 text-[#714B67]" />
        <p className="mt-3 text-sm text-gray-500 font-medium">Loading inventory command center...</p>
      </div>
    );
  }

  if (fetchError || !product) {
    return (
      <div className="bg-white border border-red-200 rounded-lg p-8 text-center shadow-sm space-y-4">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
        <h2 className="text-lg font-bold text-gray-900">Product Unavailable</h2>
        <p className="text-sm text-gray-600 max-w-md mx-auto">
          {fetchError || 'The requested product could not be found.'}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" onClick={() => navigate('/admin/merchandise')}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Merchandise
          </Button>
          <Button variant="primary" onClick={loadProduct}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const variants = Array.isArray(product.variants) ? product.variants : [];
  const totalStock = variants.reduce(
    (sum, v) => sum + Number(v.stock !== undefined ? v.stock : (v.availableQuantity || 0)),
    0
  );
  const isAvailable = product.availabilityStatus === 'AVAILABLE' || (variants.length > 0 && totalStock > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner Alert */}
      {bannerAlert && (
        <div
          className={`p-4 rounded-lg border flex items-center justify-between shadow-sm transition-all ${
            bannerAlert.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-[#017E84]/10 border-[#017E84]/30 text-[#017E84]'
          }`}
          role="alert"
        >
          <div className="flex items-center gap-3">
            {bannerAlert.type === 'error' ? (
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            ) : (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-[#017E84]" />
            )}
            <span className="text-sm font-medium">{bannerAlert.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerAlert(null)}
            className="p-1 rounded hover:bg-black/5 text-gray-500 focus:outline-none"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link to="/admin/merchandise" className="hover:text-[#714B67] hover:underline flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" />
          Admin Merchandise
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-semibold truncate max-w-xs">{product.name}</span>
      </div>

      {/* Product Header & Information */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Thumbnail */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg border border-[#e2e5e9] bg-[#F8F9FA] flex items-center justify-center shrink-0 overflow-hidden">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <ShoppingBag className="w-8 h-8 text-[#714B67]/40" />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{product.name}</h1>
              <Badge variant={isAvailable ? 'teal' : 'danger'}>
                {isAvailable ? 'AVAILABLE' : 'SOLD_OUT'}
              </Badge>
              <Badge variant={product.isMemberAvailable ? 'purple' : 'gray'}>
                {product.isMemberAvailable ? 'ACTIVE' : 'INACTIVE'}
              </Badge>
            </div>

            <p className="text-sm text-gray-600 max-w-3xl leading-relaxed whitespace-pre-line">
              {product.description || 'No description provided.'}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-gray-500">
              <span>
                Base Price:{' '}
                <strong className="text-gray-900 font-semibold">
                  {formatCurrency(product.basePrice ?? product.price ?? 0)}
                </strong>
              </span>
              <span>•</span>
              <span>
                Product ID:{' '}
                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-mono text-gray-700">
                  {productId}
                </code>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                Updated: {formatDateDisplay(product.updatedAt || product.createdAt)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0 self-start">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditProductError('');
                setEditProductOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs h-9"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setVariantError('');
                setVariantModalOpen(true);
              }}
              className="bg-[#714B67] hover:bg-[#5a3b52] text-white flex items-center gap-1.5 text-xs h-9 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Variant</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Inventory & Variant Metric Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Variants */}
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-[#e2e5e9]">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Total Variants
            </span>
            <Layers className="w-4 h-4 text-[#714B67]" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-gray-900 block">
              {variants.length}
            </span>
            <span className="text-xs text-gray-500 mt-1 block">Active sizes and options</span>
          </div>
        </div>

        {/* Total Inventory Units */}
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-[#e2e5e9]">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Total Available Units
            </span>
            <Package className="w-4 h-4 text-[#017E84]" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-[#714B67] block">
              {totalStock.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500 mt-1 block">Total stock across all variants</span>
          </div>
        </div>

        {/* Availability State */}
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-[#e2e5e9]">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Availability
            </span>
            <Badge variant={isAvailable ? 'teal' : 'danger'}>
              {isAvailable ? 'In Stock' : 'Out of Stock'}
            </Badge>
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-bold block ${isAvailable ? 'text-[#017E84]' : 'text-red-600'}`}>
              {isAvailable ? 'Ready for Purchase' : 'Needs Restock'}
            </span>
            <span className="text-xs text-gray-500 mt-1 block">
              Authoritative backend status
            </span>
          </div>
        </div>
      </div>

      {/* Variants & Stock Management Table */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#e2e5e9]">
          <div>
            <h2 className="text-base font-bold text-gray-900">Variants & Inventory Levels</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Manage size specifications, unit pricing, and real-time inventory counts (SET semantics).
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setVariantError('');
              setVariantModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Variant</span>
          </Button>
        </div>

        {variants.length === 0 ? (
          <div className="text-center py-10 bg-[#F8F9FA] rounded-lg border border-dashed border-[#e2e5e9] p-6">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-700">No variants configured for this product.</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Add sizes (e.g. Small, Medium, Large) and assign stock to enable member orders.
            </p>
            <Button
              size="sm"
              onClick={() => {
                setVariantError('');
                setVariantModalOpen(true);
              }}
              className="mt-4 text-xs bg-[#714B67] hover:bg-[#5a3b52] text-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add First Variant
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#e2e5e9] text-left text-xs">
              <thead className="bg-[#F8F9FA] text-gray-700 uppercase font-bold tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3">Variant / Size</th>
                  <th scope="col" className="px-4 py-3 text-right">Price</th>
                  <th scope="col" className="px-4 py-3 text-right">In-Stock Quantity</th>
                  <th scope="col" className="px-4 py-3 text-center">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e5e9] bg-white">
                {variants.map((v) => {
                  const vId = v.variantId || v.id;
                  const vName = v.size || v.name || 'Standard';
                  const stock = Number(v.stock !== undefined ? v.stock : (v.availableQuantity ?? 0));
                  const isStockAvailable = stock > 0;

                  return (
                    <tr key={vId} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-gray-900">{vName}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-gray-900">
                        {formatCurrency(v.price)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-extrabold whitespace-nowrap">
                        <span className={stock === 0 ? 'text-red-600' : 'text-[#017E84]'}>
                          {stock.toLocaleString()} units
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <Badge variant={isStockAvailable ? 'teal' : 'danger'}>
                          {isStockAvailable ? 'AVAILABLE' : 'OUT_OF_STOCK'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openInventoryModal(v)}
                          className="text-xs h-7 px-2.5"
                        >
                          Update Stock
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT PRODUCT MODAL */}
      {editProductOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-product-modal-title"
        >
          <div className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e5e9]">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#714B67]" />
                <h2 id="edit-product-modal-title" className="text-base font-bold text-gray-900">
                  Edit Product Details
                </h2>
              </div>
              <button
                type="button"
                onClick={() => !editProductSubmitting && setEditProductOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label="Close dialog"
                disabled={editProductSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editProductError && (
              <div className="mt-3 p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700">
                {editProductError}
              </div>
            )}

            <form onSubmit={handleEditProductSubmit} className="mt-4 space-y-3">
              <div>
                <label htmlFor="edit-prod-name" className="block text-xs font-semibold text-gray-700 mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="edit-prod-name"
                  type="text"
                  required
                  value={editProductForm.name}
                  onChange={(e) => setEditProductForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full text-xs"
                  disabled={editProductSubmitting}
                />
              </div>

              <div>
                <label htmlFor="edit-prod-desc" className="block text-xs font-semibold text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="edit-prod-desc"
                  rows={3}
                  required
                  value={editProductForm.description}
                  onChange={(e) => setEditProductForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full text-xs border border-[#e2e5e9] rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-[#714B67] bg-white text-gray-900"
                  disabled={editProductSubmitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-prod-base-price" className="block text-xs font-semibold text-gray-700 mb-1">
                    Base Price (₹)
                  </label>
                  <Input
                    id="edit-prod-base-price"
                    type="number"
                    min="0"
                    step="1"
                    value={editProductForm.basePrice}
                    onChange={(e) => setEditProductForm((prev) => ({ ...prev, basePrice: e.target.value }))}
                    className="w-full text-xs"
                    disabled={editProductSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="edit-prod-image" className="block text-xs font-semibold text-gray-700 mb-1">
                    Image URL
                  </label>
                  <Input
                    id="edit-prod-image"
                    type="text"
                    placeholder="https://..."
                    value={editProductForm.image}
                    onChange={(e) => setEditProductForm((prev) => ({ ...prev, image: e.target.value }))}
                    className="w-full text-xs"
                    disabled={editProductSubmitting}
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editProductForm.isMemberAvailable}
                    onChange={(e) =>
                      setEditProductForm((prev) => ({ ...prev, isMemberAvailable: e.target.checked }))
                    }
                    className="rounded border-gray-300 text-[#714B67] focus:ring-[#714B67]"
                    disabled={editProductSubmitting}
                  />
                  <span className="text-xs font-medium text-gray-700">
                    Make available in Member Merchandise Catalog
                  </span>
                </label>
              </div>

              <div className="pt-3 border-t border-[#e2e5e9] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditProductOpen(false)}
                  disabled={editProductSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={editProductSubmitting}
                  className="bg-[#714B67] hover:bg-[#5a3b52] text-white flex items-center gap-1.5"
                >
                  {editProductSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD VARIANT MODAL */}
      {variantModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-variant-modal-title"
        >
          <div className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e5e9]">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#714B67]" />
                <h2 id="add-variant-modal-title" className="text-base font-bold text-gray-900">
                  Add Product Variant
                </h2>
              </div>
              <button
                type="button"
                onClick={() => !variantSubmitting && setVariantModalOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label="Close dialog"
                disabled={variantSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {variantError && (
              <div className="mt-3 p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700">
                {variantError}
              </div>
            )}

            <form onSubmit={handleVariantSubmit} className="mt-4 space-y-3">
              <div>
                <label htmlFor="var-name" className="block text-xs font-semibold text-gray-700 mb-1">
                  Variant Name or Size <span className="text-red-500">*</span>
                </label>
                <Input
                  id="var-name"
                  type="text"
                  required
                  placeholder="e.g. Small, Medium, XL, Standard"
                  value={variantForm.name}
                  onChange={(e) => setVariantForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full text-xs"
                  disabled={variantSubmitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="var-price" className="block text-xs font-semibold text-gray-700 mb-1">
                    Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="var-price"
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="e.g. 899"
                    value={variantForm.price}
                    onChange={(e) => setVariantForm((prev) => ({ ...prev, price: e.target.value }))}
                    className="w-full text-xs"
                    disabled={variantSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="var-stock" className="block text-xs font-semibold text-gray-700 mb-1">
                    Initial Stock <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="var-stock"
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="e.g. 25"
                    value={variantForm.stock}
                    onChange={(e) => setVariantForm((prev) => ({ ...prev, stock: e.target.value }))}
                    className="w-full text-xs"
                    disabled={variantSubmitting}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#e2e5e9] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVariantModalOpen(false)}
                  disabled={variantSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={variantSubmitting}
                  className="bg-[#714B67] hover:bg-[#5a3b52] text-white flex items-center gap-1.5"
                >
                  {variantSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Variant</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE INVENTORY MODAL (SET Semantics) */}
      {inventoryModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inventory-modal-title"
        >
          <div className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e5e9]">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#017E84]" />
                <h2 id="inventory-modal-title" className="text-base font-bold text-gray-900">
                  Update Stock Level
                </h2>
              </div>
              <button
                type="button"
                onClick={() => !inventoryModal.submitting && setInventoryModal((prev) => ({ ...prev, open: false }))}
                className="p-1 rounded text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label="Close dialog"
                disabled={inventoryModal.submitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inventoryModal.error && (
              <div className="mt-3 p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700">
                {inventoryModal.error}
              </div>
            )}

            <form onSubmit={handleInventorySubmit} className="mt-4 space-y-3">
              <div className="bg-gray-50 p-3 rounded border border-[#e2e5e9] text-xs space-y-1">
                <div>
                  <span className="text-gray-500">Variant:</span>{' '}
                  <strong className="text-gray-900">{inventoryModal.variantName}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Current Stock:</span>{' '}
                  <strong className="text-gray-900">{inventoryModal.currentStock} units</strong>
                </div>
                <div className="text-[11px] text-gray-400 pt-1 border-t border-gray-200">
                  Operation: <strong>SET Stock</strong> (Direct authoritative level update)
                </div>
              </div>

              <div>
                <label htmlFor="new-stock-input" className="block text-xs font-semibold text-gray-700 mb-1">
                  New Available Stock Quantity <span className="text-red-500">*</span>
                </label>
                <Input
                  id="new-stock-input"
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={inventoryModal.newStock}
                  onChange={(e) =>
                    setInventoryModal((prev) => ({ ...prev, newStock: e.target.value }))
                  }
                  className="w-full text-sm font-semibold"
                  disabled={inventoryModal.submitting}
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  Assign total currently available inventory units.
                </span>
              </div>

              <div className="pt-3 border-t border-[#e2e5e9] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInventoryModal((prev) => ({ ...prev, open: false }))}
                  disabled={inventoryModal.submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={inventoryModal.submitting}
                  className="bg-[#017E84] hover:bg-[#015f64] text-white flex items-center gap-1.5"
                >
                  {inventoryModal.submitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Stock</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
