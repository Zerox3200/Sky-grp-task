interface OrderCreatedEmailParams {
  name: string;
  orderId: string;
  totalAmount: string;
  itemCount: number;
}

export const orderCreatedEmail = ({
  name,
  orderId,
  totalAmount,
  itemCount,
}: OrderCreatedEmailParams): string => `
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2>Order Confirmation</h2>
    <p>Hi ${name},</p>
    <p>Your order has been placed successfully.</p>
    <ul>
      <li><strong>Order ID:</strong> ${orderId}</li>
      <li><strong>Total:</strong> $${totalAmount}</li>
      <li><strong>Items:</strong> ${itemCount}</li>
    </ul>
    <p>Thank you for shopping with us.</p>
  </body>
</html>
`;
