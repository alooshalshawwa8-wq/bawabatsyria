alter table public.ofoq_store_orders
  drop constraint ofoq_store_orders_product_owner_fkey;
alter table public.ofoq_store_orders
  drop constraint ofoq_store_orders_pkey;
alter table public.ofoq_store_orders
  drop constraint ofoq_store_orders_user_id_id_key;
alter table public.ofoq_store_products
  drop constraint ofoq_store_products_pkey;
alter table public.ofoq_store_products
  drop constraint ofoq_store_products_user_id_id_key;
alter table public.ofoq_store_products
  add constraint ofoq_store_products_pkey primary key (user_id, id);
alter table public.ofoq_store_orders
  add constraint ofoq_store_orders_pkey primary key (user_id, id);
alter table public.ofoq_store_orders
  add constraint ofoq_store_orders_product_owner_fkey
  foreign key (user_id, product_id)
  references public.ofoq_store_products(user_id, id)
  on delete restrict;