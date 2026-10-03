import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, ArrowLeft } from 'lucide-react';
import { memberService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export default function ProductDetails() {
  const { productId } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    async function fetchProductDetails() {
      setLoading(true);
      setFormError('');
      try {
        const response = await memberService.getProductDetails(productId);
        if (response.data?.success) {
          const data = response.data.data?.product || response.data.data;
          setProduct(data);
          const variants = data.variants || [];
          if (variants.length > 0) {
            setSelectedVariantId(variants[0].variantId || variants[0].id);
          }
        } else {
          setFormError('Product item not found.');
        }
      } catch (err) {
        if (!err.response) {
          setFormError('Unable to connect to the server.');
        } else if (err.response.status === 404) {
          setFormError('The requested product item was not found.');
        } else {
          setFormError(err.response.data?.error?.message || 'Failed to fetch product details.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchProductDetails();
  }, [productId]);

  const handleOrder = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError('');
    setSuccessMessage('');

    if (!selectedVariantId) {
      setFormError('Please select a product variant/size.');
      return;
    }

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setFormError('Quantity must be an integer greater than zero.');
      return;
    }

    const currentVariant = (product.variants || []).find(
      (v) => (v.variantId || v.id) === selectedVariantId
    );

    if (currentVariant?.availableQuantity !== undefined && parsedQty > currentVariant.availableQuantity) {
      setFormError(`Only ${currentVariant.availableQuantity} items available in stock.`);
      return;
    }

    setIsSubmitting(true);

    try {
      // POST /api/member/orders with EXACT structure: { items: [{ productId, variantId, quantity }] }
      // NOTE: Client NEVER submits totalAmount, subtotal, paymentAmount, or unitPrice
      const payload = {
        items: [
          {
            productId,
            variantId: selectedVariantId,
            quantity: parsedQty,
          },
        ],
      };

      const response = await memberService.createOrder(payload);
      if (response.status === 201 || response.data?.success) {
        setSuccessMessage('Order placed successfully! Redirecting to your orders…');
        setTimeout(() => {
          navigate('/orders');
        }, 1500);
      } else {
        setFormError('Failed to place order.');
      }
    } catch (err) {
      if (!err.response) {
        setFormError('Unable to connect to the server.');
      } else {
        const errorData = err.response.data?.error;
        setFormError(errorData?.message || 'Order placement could not be completed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading item details..." />;
  }

  if (!product && formError) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Alert variant="error">{formError}</Alert>
        <Link
          to="/merchandise"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#714B67] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to merchandise
        </Link>
      </div>
    );
  }

  const variants = product?.variants || [];
  const currentVariant = variants.find((v) => (v.variantId || v.id) === selectedVariantId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        to="/merchandise"
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-600 hover:text-[#714B67] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to merchandise
      </Link>

      <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 sm:p-8 shadow-sm">
        {formError && <Alert variant="error" className="mb-6">{formError}</Alert>}
        {successMessage && <Alert variant="success" className="mb-6">{successMessage}</Alert>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Image Container */}
          <div className="bg-[#F8F9FA] border border-[#e2e5e9] rounded-lg p-6 flex items-center justify-center min-h-[280px]">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="max-h-72 max-w-full object-contain"
              />
            ) : (
              <div className="text-center text-gray-400 py-12">
                <ShoppingBag className="w-16 h-16 mx-auto mb-2 text-[#714B67]/30" />
                <span className="text-xs font-semibold uppercase tracking-wider">Campus360 Official Item</span>
              </div>
            )}
          </div>

          {/* Details & Purchase Form */}
          <div className="flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={currentVariant?.availabilityStatus === 'OUT_OF_STOCK' ? 'danger' : 'teal'}>
                  {currentVariant?.availabilityStatus || 'AVAILABLE'}
                </Badge>
              </div>

              <h1 className="text-2xl font-bold text-[#000000]">{product.name}</h1>
              <p className="text-xl font-bold text-[#714B67] mt-2">
                ₹{currentVariant?.price !== undefined ? currentVariant.price : (product.price || '—')}
              </p>

              <div className="mt-4 pt-4 border-t border-[#e2e5e9]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Description
                </h4>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {product.description || 'Official Skyline Student Association apparel.'}
                </p>
              </div>
            </div>

            {/* Purchase Form */}
            <form onSubmit={handleOrder} className="space-y-4 pt-4 border-t border-[#e2e5e9]">
              {variants.length > 0 && (
                <div>
                  <Label htmlFor="variantSelect">Select Size / Variant</Label>
                  <select
                    id="variantSelect"
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full h-10 px-3 rounded border border-gray-300 bg-white text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  >
                    {variants.map((v) => {
                      const vId = v.variantId || v.id;
                      return (
                        <option key={vId} value={vId}>
                          {v.size || v.name || 'Standard'} — ₹{v.price} ({v.availableQuantity || 0} in stock)
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={currentVariant?.availableQuantity || 10}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting || currentVariant?.availableQuantity === 0}
                className="w-full h-11 text-base font-semibold"
              >
                {isSubmitting ? 'Placing Order...' : 'Place Order'}
              </Button>

              <p className="text-[11px] text-gray-400 text-center">
                Inventory and payment calculated transactionally by server.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
