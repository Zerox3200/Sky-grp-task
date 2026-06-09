import { sequelize } from "./connection.js";
import { User } from "./Users/User.model.js";
import { Product } from "./Products/Product.model.js";
import { Order } from "./Orders/Order.model.js";
import { OrderItem } from "./Orders/OrderItem.model.js";
import { IdempotencyKey } from "./IdempotencyKeys/IdempotencyKey.model.js";

User.hasMany(Order, { foreignKey: "userId", as: "orders" });
Order.belongsTo(User, { foreignKey: "userId", as: "user" });

Order.hasMany(OrderItem, { foreignKey: "orderId", as: "items" });
OrderItem.belongsTo(Order, { foreignKey: "orderId", as: "order" });

Product.hasMany(OrderItem, { foreignKey: "productId", as: "orderItems" });
OrderItem.belongsTo(Product, { foreignKey: "productId", as: "product" });

export { sequelize, User, Product, Order, OrderItem, IdempotencyKey };
export { runMigrations, undoLastMigration, migrationStatus } from "./migrate.js";
