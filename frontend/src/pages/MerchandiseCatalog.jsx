import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { memberService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Alert } from '../components/ui/Alert';

export default function MerchandiseCatalog() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      setError('');
      try {
        const response = await memberService.getProducts();
        if (response.data?.success) {
          const items = response.data.data?.products || response.data.data || [];
          setProducts(Array.isArray(items) ? items : []);
        } else {
          setError('Unable to load merchandise items.');
        }
      } catch (err) {
        if (!err.response) {
          setError('Unable to connect to the server.');
        } else {
          setError(err.response.data?.error?.message || 'Failed to fetch merchandise.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading merchandise catalog..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#000000]">Official Merchandise</h1>
        <p className="text-sm text-[#555555] mt-1">
          Exclusive apparel and gear for Skyline Student Association members.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {products.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No merchandise available"
          description="Check back soon for upcoming association apparel and merchandise drops."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((prod) => (
            <div
              key={prod.productId}
              className="bg-white border border-[#e2e5e9] rounded-lg overflow-hidden shadow-sm hover:border-[#714B67]/40 transition-colors flex flex-col justify-between"
            >
              <div>
                {/* Product Image or Restrained Placeholder */}
                <div className="h-44 bg-[#F8F9FA] border-b border-[#e2e5e9] flex items-center justify-center p-4">
                  {prod.image ? (
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-gray-400">
                      <ShoppingBag className="w-10 h-10 mx-auto mb-1 text-[#714B67]/40" />
                      <span className="text-[11px] font-medium uppercase tracking-wider">Campus360 Gear</span>
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={prod.availabilityStatus === 'OUT_OF_STOCK' ? 'danger' : 'teal'}>
                      {prod.availabilityStatus || 'AVAILABLE'}
                    </Badge>
                    <span className="text-sm font-bold text-[#000000]">
                      ₹{prod.basePrice !== undefined ? prod.basePrice : '—'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#000000] mb-1 line-clamp-1">
                    {prod.name}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {prod.description || 'Association official item.'}
                  </p>
                </div>
              </div>

              <div className="px-5 pb-5 pt-0">
                <Link
                  to={`/merchandise/${prod.productId}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded text-xs font-semibold bg-[#714B67] text-white hover:bg-[#5d3d54] transition-colors"
                >
                  View Details <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
