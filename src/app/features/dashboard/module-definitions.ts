export interface DashboardModuleDefinition {
  key: string;
  title: string;
  endpoint: string;
  searchPlaceholder: string;
  defaultSortBy?: string;
  availableFilters?: Array<{ key: string; label: string }>;
  tableColumns?: Array<{ key: string; label: string; type?: 'text' | 'date' | 'currency' | 'count' | 'status' | 'image' }>;
  createFields?: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'email' | 'password' | 'textarea' | 'file' | 'select';
    placeholder?: string;
    required?: boolean;
    readonly?: boolean;
    options?: Array<{ value: string; label: string }>;
    optionsSource?: 'clients' | 'suppliers' | 'products' | 'services';
  }>;
  formRows?: string[][];
  lineEditors?: {
    products?: boolean;
    services?: boolean;
  };
  formIntro?: string;
  formWidth?: 'basic' | 'ext';
  saveLabel?: string;
  newButtonLabel?: string;
  offcanvasTitle?: string;
}

export const DASHBOARD_MODULES: DashboardModuleDefinition[] = [
  {
    key: 'orders',
    title: 'Pedidos',
    endpoint: 'orders',
    searchPlaceholder: 'Buscar pedidos',
    defaultSortBy: 'codigo',
    availableFilters: [
      { key: 'codigo', label: 'Codigo' },
      { key: 'cliente_id', label: 'Cliente' },
      { key: 'total', label: 'Total' },
      { key: 'estado', label: 'Estado' },
      { key: 'createdAt', label: 'Fecha' }
    ],
    tableColumns: [
      { key: 'codigo', label: 'Codigo' },
      { key: 'cliente_id', label: 'Cliente' },
      { key: 'productos', label: 'Productos', type: 'count' },
      { key: 'servicios', label: 'Servicios', type: 'count' },
      { key: 'total', label: 'Total', type: 'currency' },
      { key: 'estado', label: 'Estado', type: 'status' },
      { key: 'createdAt', label: 'Registrado', type: 'date' }
    ],
    createFields: [
      { key: 'codigo', label: 'Código*', type: 'text', placeholder: 'Código del pedido', required: true, readonly: true },
      { key: 'cliente_id', label: 'Cliente*', type: 'select', required: true, optionsSource: 'clients' },
      {
        key: 'estado',
        label: 'Estado',
        type: 'select',
        required: true,
        options: [
          { value: 'creado', label: 'Creado' },
          { value: 'listo', label: 'Listo' },
          { value: 'completado', label: 'Completado' },
          { value: 'cancelado', label: 'Cancelado' }
        ]
      }
    ],
    formRows: [['codigo', 'cliente_id', 'estado']],
    lineEditors: { products: true, services: true },
    formIntro: 'En esta sección vamos a crear y actualizar pedidos. Completa los campos solicitados*.',
    formWidth: 'ext',
    saveLabel: 'Guardar pedido',
    newButtonLabel: 'Nuevo pedido',
    offcanvasTitle: 'Pedidos'
  },
  {
    key: 'purchases',
    title: 'Compras',
    endpoint: 'purchases',
    searchPlaceholder: 'Buscar compras',
    defaultSortBy: 'codigo',
    availableFilters: [
      { key: 'codigo', label: 'Codigo' },
      { key: 'proveedor_id', label: 'Proveedor' },
      { key: 'total', label: 'Total' },
      { key: 'createdAt', label: 'Fecha' }
    ],
    tableColumns: [
      { key: 'codigo', label: 'Codigo' },
      { key: 'proveedor_id', label: 'Proveedor' },
      { key: 'productos', label: 'Productos', type: 'count' },
      { key: 'total', label: 'Total', type: 'currency' },
      { key: 'createdAt', label: 'Registrado', type: 'date' }
    ],
    createFields: [
      { key: 'codigo', label: 'Código*', type: 'text', placeholder: 'Código de la compra', required: true, readonly: true },
      { key: 'proveedor_id', label: 'Proveedor*', type: 'select', required: true, optionsSource: 'suppliers' }
    ],
    formRows: [['codigo', 'proveedor_id']],
    lineEditors: { products: true },
    formIntro: 'En esta sección vamos a crear y actualizar las compras. Completa los campos solicitados*.',
    formWidth: 'ext',
    saveLabel: 'Guardar compra',
    newButtonLabel: 'Nueva compra',
    offcanvasTitle: 'Compras'
  },
  {
    key: 'clients',
    title: 'Clientes',
    endpoint: 'clients',
    searchPlaceholder: 'Buscar clientes',
    defaultSortBy: 'codigo',
    availableFilters: [
      { key: 'codigo', label: 'Código' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'correo', label: 'Correo' },
      { key: 'telefono', label: 'Teléfono' },
      { key: 'createdAt', label: 'Fecha' }
    ],
    tableColumns: [
      { key: 'codigo', label: 'Código' },
      { key: 'nombre_completo', label: 'Nombre' },
      { key: 'correo', label: 'Correo' },
      { key: 'telefono', label: 'Teléfono' },
      { key: 'createdAt', label: 'Registrado', type: 'date' }
    ],
    createFields: [
      { key: 'codigo', label: 'Código*', type: 'text', placeholder: 'Código del cliente', required: true },
      { key: 'nombre', label: 'Nombre*', type: 'text', placeholder: 'Nombre del cliente', required: true },
      { key: 'primer_apellido', label: 'Primer apellido', type: 'text', placeholder: 'Primer apellido del cliente' },
      { key: 'segundo_apellido', label: 'Segundo apellido', type: 'text', placeholder: 'Segundo apellido del cliente' },
      { key: 'correo', label: 'Correo electrónico', type: 'email', placeholder: 'Correo del cliente' },
      { key: 'telefono', label: 'Teléfono', type: 'text', placeholder: 'Teléfono del cliente' }
    ],
    formRows: [['codigo', 'nombre'], ['primer_apellido', 'segundo_apellido'], ['correo', 'telefono']],
    formIntro: 'En esta sección vamos a crear y actualizar los clientes, a continuación llena la información solicitada* para crear o actualizar el cliente.',
    formWidth: 'basic',
    saveLabel: 'Guardar cliente',
    newButtonLabel: 'Nuevo cliente',
    offcanvasTitle: 'Clientes'
  },
  {
    key: 'providers',
    title: 'Proveedores',
    endpoint: 'suppliers',
    searchPlaceholder: 'Buscar proveedores',
    defaultSortBy: 'codigo',
    availableFilters: [
      { key: 'codigo', label: 'Codigo' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'correo', label: 'Correo' },
      { key: 'telefono', label: 'Telefono' },
      { key: 'createdAt', label: 'Fecha' }
    ],
    tableColumns: [
      { key: 'codigo', label: 'Código' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'correo', label: 'Correo' },
      { key: 'telefono', label: 'Telefono' },
      { key: 'direccion', label: 'Direccion' },
      { key: 'createdAt', label: 'Registrado', type: 'date' }
    ],
    createFields: [
      { key: 'codigo', label: 'Código*', type: 'text', placeholder: 'Código del proveedor', required: true },
      { key: 'nombre', label: 'Nombre*', type: 'text', placeholder: 'Nombre del proveedor', required: true },
      { key: 'correo', label: 'Correo electrónico', type: 'email', placeholder: 'Correo del proveedor' },
      { key: 'telefono', label: 'Teléfono', type: 'text', placeholder: 'Teléfono del proveedor' },
      { key: 'direccion', label: 'Dirección', type: 'textarea', placeholder: 'Dirección del proveedor' }
    ],
    formRows: [['codigo', 'nombre'], ['correo', 'telefono'], ['direccion']],
    formIntro: 'En esta sección vamos a crear y actualizar los proveedores, a continuación llena la información solicitada* para crear o actualizar el proveedor.',
    formWidth: 'basic',
    saveLabel: 'Guardar proveedor',
    newButtonLabel: 'Nuevo proveedor',
    offcanvasTitle: 'Proveedores'
  },
  {
    key: 'products',
    title: 'Productos',
    endpoint: 'products',
    searchPlaceholder: 'Buscar productos',
    defaultSortBy: 'codigo',
    availableFilters: [
      { key: 'codigo', label: 'Código' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'unidad_medida', label: 'Unidad' },
      { key: 'precio', label: 'Precio' },
      { key: 'stock', label: 'Stock' },
      { key: 'createdAt', label: 'Fecha' }
    ],
    tableColumns: [
      { key: 'imagen', label: 'Imagen', type: 'image' },
      { key: 'codigo', label: 'Código' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'descripcion', label: 'Descripción' },
      { key: 'unidad_medida', label: 'Unidad' },
      { key: 'precio', label: 'Precio', type: 'currency' },
      { key: 'stock', label: 'Stock' },
      { key: 'createdAt', label: 'Registrado', type: 'date' }
    ],
    createFields: [
      { key: 'codigo', label: 'Código*', type: 'text', placeholder: 'Código del producto', required: true },
      { key: 'nombre', label: 'Nombre*', type: 'text', placeholder: 'Nombre del producto', required: true },
      { key: 'descripcion', label: 'Descripción', type: 'textarea', placeholder: 'Escribe aquí la descripción del producto' },
      { key: 'unidad_medida', label: 'Unidad de medida*', type: 'text', placeholder: 'Ej. pieza, caja, kg', required: true },
      { key: 'precio', label: 'Precio*', type: 'number', placeholder: '0.00', required: true },
      { key: 'stock', label: 'Stock*', type: 'number', placeholder: '0', required: true },
      { key: 'imagen', label: 'Imagen', type: 'file' }
    ],
    formRows: [['codigo', 'nombre'], ['descripcion'], ['unidad_medida', 'precio', 'stock'], ['imagen']],
    formIntro: 'En esta sección vamos a crear y actualizar los productos, a continuación llena la información solicitada* para crear o actualizar el producto.',
    formWidth: 'basic',
    saveLabel: 'Guardar producto',
    newButtonLabel: 'Registrar producto',
    offcanvasTitle: 'Productos'
  },
  {
    key: 'services',
    title: 'Servicios',
    endpoint: 'services',
    searchPlaceholder: 'Buscar servicios',
    defaultSortBy: 'codigo',
    availableFilters: [
      { key: 'codigo', label: 'Codigo' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'unidad_medida', label: 'Unidad' },
      { key: 'precio', label: 'Precio' },
      { key: 'createdAt', label: 'Fecha' }
    ],
    tableColumns: [
      { key: 'imagen', label: 'Imagen', type: 'image' },
      { key: 'codigo', label: 'Codigo' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'descripcion', label: 'Descripcion' },
      { key: 'unidad_medida', label: 'Unidad' },
      { key: 'precio', label: 'Precio', type: 'currency' },
      { key: 'createdAt', label: 'Registrado', type: 'date' }
    ],
    createFields: [
      { key: 'codigo', label: 'Código*', type: 'text', placeholder: 'Código del servicio', required: true },
      { key: 'nombre', label: 'Nombre*', type: 'text', placeholder: 'Nombre del servicio', required: true },
      { key: 'descripcion', label: 'Descripción', type: 'textarea', placeholder: 'Escribe aquí la descripción del servicio' },
      { key: 'unidad_medida', label: 'Unidad de medida*', type: 'text', placeholder: 'Ej. KG, PIEZA', required: true },
      { key: 'precio', label: 'Precio*', type: 'number', placeholder: '0.00', required: true },
      { key: 'imagen', label: 'Imagen', type: 'file' }
    ],
    formRows: [['codigo', 'nombre'], ['descripcion'], ['unidad_medida', 'precio'], ['imagen']],
    formIntro: 'En esta sección vamos a crear y actualizar servicios, a continuación llena la información solicitada*.',
    formWidth: 'basic',
    saveLabel: 'Guardar servicio',
    newButtonLabel: 'Nuevo servicio',
    offcanvasTitle: 'Servicios'
  },
  {
    key: 'users',
    title: 'Usuarios',
    endpoint: 'users',
    searchPlaceholder: 'Buscar usuarios',
    defaultSortBy: 'usuario',
    availableFilters: [
      { key: 'usuario', label: 'Usuario' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'correo', label: 'Correo' },
      { key: 'createdAt', label: 'Fecha' }
    ],
    tableColumns: [
      { key: 'usuario', label: 'Usuario' },
      { key: 'nombre_completo', label: 'Nombre' },
      { key: 'correo', label: 'Correo' },
      { key: 'rol', label: 'Rol' },
      { key: 'createdAt', label: 'Registrado', type: 'date' }
    ],
    createFields: [
      { key: 'usuario', label: 'Usuario*', type: 'text', placeholder: 'Nombre del usuario', required: true },
      { key: 'nombre', label: 'Nombre*', type: 'text', placeholder: 'Nombre del usuario', required: true },
      { key: 'primer_apellido', label: 'Primer apellido', type: 'text', placeholder: 'Nombre del usuario' },
      { key: 'segundo_apellido', label: 'Segundo apellido', type: 'text', placeholder: 'Nombre del usuario' },
      { key: 'correo', label: 'Correo electrónico*', type: 'email', placeholder: 'Correo electrónico del usuario', required: true },
      {
        key: 'rol',
        label: 'Rol*',
        type: 'select',
        required: true,
        options: [
          { value: 'administrador', label: 'Administrador' },
          { value: 'usuario', label: 'Usuario' },
          { value: 'invitado', label: 'Invitado' }
        ]
      }
    ],
    formRows: [['usuario', 'nombre'], ['primer_apellido', 'segundo_apellido'], ['correo'], ['rol']],
    formIntro: 'En esta sección vamos a crear y actualizar los usuarios del sistema, a continuación llena la información solicitada* para crear o actualizar el usuario.',
    formWidth: 'basic',
    saveLabel: 'Guardar usuario',
    newButtonLabel: 'Nuevo usuario',
    offcanvasTitle: 'Usuarios'
  }
];

export const MODULE_PLACEHOLDER_MAP = Object.fromEntries(
  DASHBOARD_MODULES.map((moduleItem) => [moduleItem.key, moduleItem.searchPlaceholder])
);

