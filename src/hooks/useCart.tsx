import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const product = cart.filter((prod) => prod.id === productId);

      if (product.length > 0) {
        updateProductAmount({ productId: product[0].id, amount: product[0].amount + 1})
        return;
      }

      const response = await api.get(`stock/${productId}`)
      const productStock: Stock = response.data
      if (productStock.amount < 1) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const { data } = await api.get(`products/${productId}`)
      data.amount = 1
      setCart([...cart, data])
      localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, data]));

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productToRemove = cart.filter((prod) => prod.id === productId)
      if (productToRemove.length === 0) {
        throw new Error();
      }
      const productsToMaintain = cart.filter((prod) => prod.id !== productId)
      setCart(productsToMaintain)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(productsToMaintain));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if (amount <= 0) return

      const response = await api.get(`stock/${productId}`)
      const productStock: Stock = response.data
      if (productStock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      const productToUpdate = cart.filter((prod) => prod.id === productId)
      const productsToMaintain = cart.filter((prod) => prod.id !== productId)
      productToUpdate[0].amount = amount
      setCart([...productsToMaintain, productToUpdate[0]])
      localStorage.setItem('@RocketShoes:cart', JSON.stringify([...productsToMaintain, productToUpdate[0]]));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
