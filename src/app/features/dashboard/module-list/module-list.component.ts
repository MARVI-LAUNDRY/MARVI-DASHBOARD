import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AlertsService } from '../../../core/services/alerts.service';
import { ApiService } from '../../../core/services/api.service';
import { SessionService } from '../../../core/services/session.service';
import { DASHBOARD_MODULES, DashboardModuleDefinition } from '../module-definitions';

interface ApiCollectionResponse {
  success: boolean;
  message: string;
  error?: string;
  data?: Array<Record<string, unknown>>;
  pagination?: {
    page?: number;
    totalPages?: number;
    total?: number;
    totalRecords?: number;
  };
}

interface ApiItemResponse {
  success: boolean;
  message: string;
  error?: string;
  data?: Record<string, unknown>;
}

interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'currency' | 'count' | 'status' | 'image';
}

@Component({
  selector: 'app-module-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './module-list.component.html',
  styleUrl: './module-list.component.scss'
})
export class ModuleListComponent implements OnInit, OnDestroy {
  private readonly adminOnlyModules = new Set(['users', 'clients', 'providers', 'purchases']);

  moduleDef: DashboardModuleDefinition | null = null;

  rows: Array<Record<string, unknown>> = [];
  keys: string[] = [];
  selectedIds = new Set<string>();

  loading = false;
  page = 1;
  totalPages = 1;
  totalRows = 0;

  sortBy = 'codigo';
  sortOrder: 'asc' | 'desc' = 'desc';
  searchValue = '';
  selectedFilterLabel = 'Filtros';
  showFilterMenu = false;
  showForm = false;
  selectedRecordId = '';
  formMode: 'create' | 'consult' | 'edit' = 'create';
  activeRowMenuId = '';
  formData: Record<string, string | number> = {};
  formFiles: Record<string, File | null> = {};

  productLines: Array<{ itemId: string; cantidad: number; precio: number }> = [];
  serviceLines: Array<{ itemId: string; cantidad: number; precio: number }> = [];
  productOptions: Array<{ value: string; label: string }> = [];
  serviceOptions: Array<{ value: string; label: string }> = [];
  clientsOptions: Array<{ value: string; label: string }> = [];
  suppliersOptions: Array<{ value: string; label: string }> = [];

  private readonly sub = new Subscription();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: ApiService,
    private readonly session: SessionService,
    private readonly alerts: AlertsService
  ) {}

  ngOnInit(): void {
    this.sub.add(
      this.route.url.subscribe(() => {
        this.resolveModuleFromRoute();
        void this.loadRows(1);
      })
    );

    this.sub.add(
      this.route.queryParamMap.subscribe((params) => {
        this.searchValue = params.get('q') ?? '';
        void this.loadRows(1);
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  get selectedCount(): number {
    return this.selectedIds.size;
  }

  get visibleKeys(): string[] {
    return this.keys.filter((key) => !['_id', '__v'].includes(key));
  }

  get canDeleteRows(): boolean {
    return this.selectedIds.size > 0;
  }

  get availableFilters(): Array<{ key: string; label: string }> {
    if (this.moduleDef?.availableFilters?.length) {
      return this.moduleDef.availableFilters;
    }

    return this.visibleKeys.map((key) => ({ key, label: key }));
  }

  get canCreate(): boolean {
    return (this.moduleDef?.createFields?.length ?? 0) > 0;
  }

  get formIntro(): string {
    return this.moduleDef?.formIntro ?? '';
  }

  get saveButtonLabel(): string {
    return this.moduleDef?.saveLabel ?? 'Guardar';
  }

  get newButtonLabel(): string {
    return this.moduleDef?.newButtonLabel ?? `Nuevo ${this.moduleDef?.title?.toLowerCase() ?? 'registro'}`;
  }

  get offcanvasTitle(): string {
    return this.moduleDef?.offcanvasTitle ?? this.moduleDef?.title ?? 'Registros';
  }

  get isExtendedForm(): boolean {
    return this.moduleDef?.formWidth === 'ext';
  }

  get canEnableEdit(): boolean {
    return this.formMode === 'consult';
  }

  get createFields() {
    return this.moduleDef?.createFields ?? [];
  }

  get tableColumns(): TableColumn[] {
    return this.moduleDef?.tableColumns ?? this.visibleKeys.map((key) => ({ key, label: key }));
  }

  get formRows(): string[][] {
    return this.moduleDef?.formRows ?? this.createFields.map((field) => [field.key]);
  }

  get showProductsEditor(): boolean {
    return this.moduleDef?.lineEditors?.products ?? false;
  }

  get showServicesEditor(): boolean {
    return this.moduleDef?.lineEditors?.services ?? false;
  }

  get purchaseTotal(): number {
    return this.productLines.reduce((sum, line) => sum + line.cantidad * line.precio, 0);
  }

  get orderTotal(): number {
    const productTotal = this.productLines.reduce((sum, line) => sum + line.cantidad * line.precio, 0);
    const serviceTotal = this.serviceLines.reduce((sum, line) => sum + line.cantidad * line.precio, 0);
    return productTotal + serviceTotal;
  }

  async toggleSort(): Promise<void> {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    await this.loadRows(1);
  }

  toggleFilterMenu(): void {
    this.showFilterMenu = !this.showFilterMenu;
  }

  getFieldOptions(fieldKey: string): Array<{ value: string; label: string }> {
    const field = this.createFields.find((item) => item.key === fieldKey);
    if (!field) {
      return [];
    }

    if (field.options) {
      return field.options;
    }

    if (field.optionsSource === 'clients') {
      return this.clientsOptions;
    }

    if (field.optionsSource === 'suppliers') {
      return this.suppliersOptions;
    }

    if (field.optionsSource === 'products') {
      return this.productOptions;
    }

    if (field.optionsSource === 'services') {
      return this.serviceOptions;
    }

    return [];
  }

  async selectFilter(filter: { key: string; label: string }): Promise<void> {
    this.sortBy = filter.key;
    this.selectedFilterLabel = filter.label;
    this.showFilterMenu = false;
    await this.loadRows(1);
  }

  openCreateForm(): void {
    if (!this.canCreate) {
      void this.alerts.message('Modulo avanzado', 'Este modulo requiere un formulario especifico, lo migro en la siguiente fase.', 'info', 1800);
      return;
    }

    const defaults: Record<string, string | number> = {};
    this.formFiles = {};
    this.createFields.forEach((field) => {
      defaults[field.key] = field.type === 'number' ? 0 : '';
      if (field.type === 'file') {
        this.formFiles[field.key] = null;
      }
    });

    if (this.moduleDef?.key === 'orders') {
      defaults['codigo'] = this.generateTimeBasedCode('PED');
      defaults['estado'] = 'creado';
    }

    if (this.moduleDef?.key === 'purchases') {
      defaults['codigo'] = this.generateTimeBasedCode('COM');
    }

    this.formMode = 'create';
    this.selectedRecordId = '';
    this.formData = defaults;
    this.productLines = this.showProductsEditor ? [{ itemId: '', cantidad: 1, precio: 0 }] : [];
    this.serviceLines = this.showServicesEditor ? [{ itemId: '', cantidad: 1, precio: 0 }] : [];
    void this.loadCatalogsForForm();
    this.showForm = true;
  }

  closeCreateForm(): void {
    this.showForm = false;
    this.formMode = 'create';
    this.selectedRecordId = '';
    this.formData = {};
    this.formFiles = {};
    this.productLines = [];
    this.serviceLines = [];
  }

  onFileSelected(fieldKey: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formFiles[fieldKey] = target.files && target.files.length > 0 ? target.files[0] : null;
  }

  addProductLine(): void {
    this.productLines.push({ itemId: '', cantidad: 1, precio: 0 });
  }

  removeProductLine(index: number): void {
    if (this.productLines.length <= 1) {
      this.productLines[0] = { itemId: '', cantidad: 1, precio: 0 };
      return;
    }

    this.productLines.splice(index, 1);
  }

  addServiceLine(): void {
    this.serviceLines.push({ itemId: '', cantidad: 1, precio: 0 });
  }

  removeServiceLine(index: number): void {
    if (this.serviceLines.length <= 1) {
      this.serviceLines[0] = { itemId: '', cantidad: 1, precio: 0 };
      return;
    }

    this.serviceLines.splice(index, 1);
  }

  async submitCreateForm(): Promise<void> {
    if (!this.moduleDef || !this.canCreate) {
      return;
    }

    if (this.formMode === 'consult') {
      return;
    }

    const payload: Record<string, unknown> = {};
    for (const field of this.createFields) {
      if (field.type === 'file') {
        continue;
      }

      const value = this.formData[field.key];

      if (field.required && (value === '' || value === null || value === undefined)) {
        await this.alerts.message('Faltan campos', `Completa el campo ${field.label}.`, 'info', 1500);
        return;
      }

      payload[field.key] = field.type === 'number' ? Number(value ?? 0) : value;
    }

    if (this.showProductsEditor) {
      payload['productos'] = this.productLines
        .filter((line) => line.itemId)
        .map((line) => ({ producto_id: line.itemId, cantidad: Number(line.cantidad), precio_unitario: Number(line.precio) }));
      if ((payload['productos'] as unknown[]).length === 0) {
        await this.alerts.message('Faltan campos', 'Agrega al menos un producto.', 'info', 1500);
        return;
      }
    }

    if (this.showServicesEditor) {
      payload['servicios'] = this.serviceLines
        .filter((line) => line.itemId)
        .map((line) => ({ servicio_id: line.itemId, cantidad: Number(line.cantidad), precio_unitario: Number(line.precio) }));
    }

    let requestBody: unknown = payload;
    const fileField = this.createFields.find((field) => field.type === 'file');
    if (fileField) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
          return;
        }

        formData.append(key, String(value ?? ''));
      });

      if (this.formFiles[fileField.key]) {
        formData.append(fileField.key, this.formFiles[fileField.key] as Blob);
      }

      if (this.moduleDef.key === 'products') {
        formData.append('stokc', String(payload['stock'] ?? 0));
      }

      requestBody = formData;
    }

    const token = this.session.getToken();
    let response: { success: boolean; message: string; error?: string };

    if (this.formMode === 'edit' && this.selectedRecordId) {
      if (this.moduleDef.key === 'orders') {
        response = await this.api.patch<{ success: boolean; message: string; error?: string }>(
          `${this.moduleDef.endpoint}/${this.selectedRecordId}`,
          { estado: payload['estado'] },
          token
        );
      } else if (this.moduleDef.key === 'users') {
        response = await this.api.put<{ success: boolean; message: string; error?: string }>(
          `${this.moduleDef.endpoint}/${this.selectedRecordId}`,
          { rol: payload['rol'] },
          token
        );
      } else {
        response = await this.api.put<{ success: boolean; message: string; error?: string }>(
          `${this.moduleDef.endpoint}/${this.selectedRecordId}`,
          requestBody,
          token
        );
      }
    } else {
      response = await this.api.post<{ success: boolean; message: string; error?: string }>(
        this.moduleDef.endpoint,
        requestBody,
        token
      );
    }

    if (!response.success) {
      await this.alerts.message(response.message, response.error ?? 'No fue posible guardar.', 'error', 2200);
      return;
    }

    await this.alerts.message(this.formMode === 'edit' ? 'Registro actualizado' : 'Registro creado', response.message, 'success', 1300);
    this.closeCreateForm();
    await this.loadRows(1);
  }

  toggleRowMenu(row: Record<string, unknown>): void {
    const rowId = this.resolveId(row);
    this.activeRowMenuId = this.activeRowMenuId === rowId ? '' : rowId;
  }

  isRowMenuOpen(row: Record<string, unknown>): boolean {
    return this.activeRowMenuId === this.resolveId(row);
  }

  async consultRow(row: Record<string, unknown>): Promise<void> {
    if (!this.moduleDef) {
      return;
    }

    const id = this.resolveId(row);
    if (!id) {
      return;
    }

    this.activeRowMenuId = '';
    this.formMode = 'consult';
    this.selectedRecordId = id;
    await this.loadCatalogsForForm();

    const token = this.session.getToken();
    const response = await this.api.get<ApiItemResponse>(`${this.moduleDef.endpoint}/${id}`, token);
    const record = response.success && response.data ? response.data : row;

    const defaults: Record<string, string | number> = {};
    this.createFields.forEach((field) => {
      const value = record[field.key];
      defaults[field.key] = typeof value === 'number' ? value : String(value ?? '');
    });

    if (this.moduleDef.key === 'orders') {
      defaults['estado'] = String(record['estado'] ?? defaults['estado'] ?? 'creado');
    }

    this.formData = defaults;
    this.productLines = this.showProductsEditor
      ? this.mapLines(record['productos'], 'producto_id')
      : [];
    this.serviceLines = this.showServicesEditor
      ? this.mapLines(record['servicios'], 'servicio_id')
      : [];

    this.showForm = true;
  }

  enableEditMode(): void {
    if (this.formMode !== 'consult') {
      return;
    }

    this.formMode = 'edit';
  }

  async deleteRow(row: Record<string, unknown>): Promise<void> {
    if (!this.moduleDef) {
      return;
    }

    const id = this.resolveId(row);
    if (!id) {
      return;
    }

    this.activeRowMenuId = '';
    const confirmed = await this.alerts.confirm(
      `Eliminar ${this.moduleDef.title.toLowerCase()}`,
      'Este registro sera eliminado. Deseas continuar?',
      'warning'
    );

    if (!confirmed) {
      return;
    }

    const token = this.session.getToken();
    const response = await this.api.delete<{ success: boolean; message: string; error?: string }>(
      `${this.moduleDef.endpoint}/${id}`,
      token
    );

    if (!response.success) {
      await this.alerts.message(response.message, response.error ?? 'No fue posible eliminar.', 'error', 2200);
      return;
    }

    await this.alerts.message('Registro eliminado', response.message, 'success', 1300);
    await this.loadRows(this.page);
  }

  onToggleSelect(row: Record<string, unknown>, checked: boolean): void {
    const id = this.resolveId(row);
    if (!id) {
      return;
    }

    if (checked) {
      this.selectedIds.add(id);
      return;
    }

    this.selectedIds.delete(id);
  }

  isRowSelected(row: Record<string, unknown>): boolean {
    return this.selectedIds.has(this.resolveId(row));
  }

  async deleteSelected(): Promise<void> {
    if (!this.moduleDef || this.selectedIds.size === 0) {
      return;
    }

    const confirmed = await this.alerts.confirm(
      `Eliminar ${this.moduleDef.title.toLowerCase()}`,
      `Se eliminaran ${this.selectedIds.size} registros. Deseas continuar?`,
      'warning'
    );

    if (!confirmed) {
      return;
    }

    const token = this.session.getToken();
    let deleted = 0;

    for (const id of this.selectedIds) {
      const response = await this.api.delete<{ success: boolean }>(`${this.moduleDef.endpoint}/${id}`, token);
      if (response.success) {
        deleted += 1;
      }
    }

    this.selectedIds.clear();
    await this.alerts.message('Proceso completado', `Registros eliminados: ${deleted}`, 'success', 1200);
    await this.loadRows(this.page);
  }

  async goStart(): Promise<void> {
    await this.loadRows(1);
  }

  async goPrev(): Promise<void> {
    await this.loadRows(Math.max(1, this.page - 1));
  }

  async goNext(): Promise<void> {
    await this.loadRows(Math.min(this.totalPages, this.page + 1));
  }

  async goEnd(): Promise<void> {
    await this.loadRows(this.totalPages);
  }

  displayValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return 'Sin informacion';
    }

    if (Array.isArray(value)) {
      return value.length > 0 ? String(value.length) : 'Sin informacion';
    }

    if (typeof value === 'object') {
      return this.formatSnapshot(value);
    }

    return String(value);
  }

  displayColumnValue(row: Record<string, unknown>, column: TableColumn): string {
    const value = row[column.key];

    if (column.key === 'nombre_completo') {
      return this.resolveFullName(row);
    }

    if (column.type === 'count') {
      return Array.isArray(value) ? String(value.length) : '0';
    }

    if (column.type === 'currency') {
      return `$${Number(value ?? 0).toFixed(2)}`;
    }

    if (column.type === 'date') {
      return this.formatDate(value);
    }

    if (column.key === 'cliente_id' && row['cliente_snapshot']) {
      return this.formatSnapshot(row['cliente_snapshot']);
    }

    if (column.key === 'proveedor_id' && row['proveedor_snapshot']) {
      return this.formatSnapshot(row['proveedor_snapshot']);
    }

    return this.displayValue(value);
  }

  isFieldDisabled(fieldKey: string): boolean {
    if (this.formMode === 'create') {
      return false;
    }

    if (this.formMode === 'consult') {
      return true;
    }

    if (this.moduleDef?.key === 'orders') {
      return fieldKey !== 'estado';
    }

    if (this.moduleDef?.key === 'users') {
      return fieldKey !== 'rol';
    }

    return false;
  }

  isLineEditorDisabled(): boolean {
    if (this.formMode === 'create') {
      return false;
    }

    if (this.formMode === 'consult') {
      return true;
    }

    return this.moduleDef?.key === 'orders';
  }

  getImageUrl(row: Record<string, unknown>, columnKey: string): string | null {
    const value = row[columnKey];
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }

    const alternate = row['imagen_url'];
    if (typeof alternate === 'string' && alternate.trim() !== '') {
      return alternate;
    }

    return null;
  }

  getStatusClass(value: unknown): string {
    const status = String(value ?? '').toLowerCase();
    if (status === 'creado') {
      return 'R';
    }

    if (status === 'listo') {
      return 'E';
    }

    if (status === 'completado') {
      return 'P';
    }

    if (status === 'cancelado') {
      return 'C';
    }

    return '';
  }

  getFieldsForRow(row: string[]) {
    return row
      .map((key) => this.createFields.find((field) => field.key === key))
      .filter((field): field is NonNullable<typeof field> => !!field);
  }

  getFieldPrefix(fieldKey: string): string {
    if (fieldKey === 'precio') {
      return '$';
    }

    if (fieldKey === 'stock') {
      return 'U';
    }

    return '';
  }

  private resolveModuleFromRoute(): void {
    const moduleKey = this.route.snapshot.routeConfig?.path ?? '';
    this.moduleDef = DASHBOARD_MODULES.find((moduleItem) => moduleItem.key === moduleKey) ?? null;
    this.sortBy = this.moduleDef?.defaultSortBy ?? 'codigo';
    const defaultFilter = this.availableFilters.find((filter) => filter.key === this.sortBy);
    this.selectedFilterLabel = defaultFilter?.label ?? 'Filtros';
    this.showFilterMenu = false;
    this.closeCreateForm();
    this.selectedIds.clear();
  }

  private async loadRows(page: number): Promise<void> {
    if (!this.moduleDef) {
      return;
    }

    const sessionUser = this.session.getUser();
    if (sessionUser && sessionUser.rol !== 'administrador' && this.adminOnlyModules.has(this.moduleDef.key)) {
      this.rows = [];
      this.keys = [];
      await this.alerts.message('Acceso denegado', 'No tienes permisos para acceder a este modulo.', 'error', 2000);
      return;
    }

    this.loading = true;

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        search: this.searchValue,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder
      });

      const token = this.session.getToken();
      const response = await this.api.get<ApiCollectionResponse>(`${this.moduleDef.endpoint}?${params.toString()}`, token);

      if (!response.success) {
        await this.alerts.message(response.message, response.error ?? '', 'error', 2200);
        this.rows = [];
        return;
      }

      this.rows = response.data ?? [];
      this.keys = this.collectTableKeys(this.rows);
      this.page = response.pagination?.page ?? page;
      this.totalPages = response.pagination?.totalPages ?? 1;
      this.totalRows = response.pagination?.totalRecords ?? response.pagination?.total ?? this.rows.length;
      this.selectedIds.clear();
    } finally {
      this.loading = false;
    }
  }

  private async loadCatalogsForForm(): Promise<void> {
    if (!this.moduleDef) {
      return;
    }

    const token = this.session.getToken();
    const needClients = this.createFields.some((field) => field.optionsSource === 'clients');
    const needSuppliers = this.createFields.some((field) => field.optionsSource === 'suppliers');
    const needProducts = this.showProductsEditor || this.createFields.some((field) => field.optionsSource === 'products');
    const needServices = this.showServicesEditor || this.createFields.some((field) => field.optionsSource === 'services');

    if (needClients) {
      const clients = await this.api.get<ApiCollectionResponse>('clients?page=1&limit=100&search=&sortBy=nombre&sortOrder=asc', token);
      this.clientsOptions = (clients.data ?? []).map((item) => ({
        value: String(item['_id'] ?? ''),
        label: this.displayValue(item['nombre_completo'] ?? item['nombre'] ?? item['codigo'])
      }));
    }

    if (needSuppliers) {
      const suppliers = await this.api.get<ApiCollectionResponse>('suppliers?page=1&limit=100&search=&sortBy=nombre&sortOrder=asc', token);
      this.suppliersOptions = (suppliers.data ?? []).map((item) => ({
        value: String(item['_id'] ?? ''),
        label: this.displayValue(item['nombre'] ?? item['codigo'])
      }));
    }

    if (needProducts) {
      const products = await this.api.get<ApiCollectionResponse>('products?page=1&limit=100&search=&sortBy=nombre&sortOrder=asc', token);
      this.productOptions = (products.data ?? []).map((item) => ({
        value: String(item['_id'] ?? ''),
        label: this.displayValue(item['nombre'] ?? item['codigo'])
      }));
    }

    if (needServices) {
      const services = await this.api.get<ApiCollectionResponse>('services?page=1&limit=100&search=&sortBy=nombre&sortOrder=asc', token);
      this.serviceOptions = (services.data ?? []).map((item) => ({
        value: String(item['_id'] ?? ''),
        label: this.displayValue(item['nombre'] ?? item['codigo'])
      }));
    }
  }

  private formatDate(value: unknown): string {
    if (!value) {
      return 'Sin informacion';
    }

    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}/${month}/${year}`;
  }

  private resolveFullName(row: Record<string, unknown>): string {
    const fromApi = row['nombre_completo'];
    if (fromApi) {
      return this.displayValue(fromApi);
    }

    const fullName = [row['nombre'], row['primer_apellido'], row['segundo_apellido']]
      .filter((part) => part)
      .map((part) => String(part))
      .join(' ')
      .trim();

    return fullName || 'Sin informacion';
  }

  private formatSnapshot(snapshot: unknown): string {
    if (typeof snapshot === 'string') {
      return snapshot.trim() || 'Sin informacion';
    }

    if (!snapshot || typeof snapshot !== 'object') {
      return 'Sin informacion';
    }

    const casted = snapshot as Record<string, unknown>;
    const code = String(casted['codigo'] ?? '').trim();
    const name = String(casted['nombre'] ?? casted['nombre_completo'] ?? '').trim();

    if (code && name) {
      return `${code} : ${name}`;
    }

    if (name) {
      return name;
    }

    if (code) {
      return code;
    }

    return 'Sin informacion';
  }

  private mapLines(source: unknown, idKey: 'producto_id' | 'servicio_id'): Array<{ itemId: string; cantidad: number; precio: number }> {
    if (!Array.isArray(source) || source.length === 0) {
      return [{ itemId: '', cantidad: 1, precio: 0 }];
    }

    return source.map((raw) => {
      const line = raw as Record<string, unknown>;
      const rawId = line[idKey];
      const itemId = typeof rawId === 'object' && rawId !== null
        ? String((rawId as Record<string, unknown>)['_id'] ?? '')
        : String(rawId ?? '');

      return {
        itemId,
        cantidad: Number(line['cantidad'] ?? 1),
        precio: Number(line['precio_unitario'] ?? 0)
      };
    });
  }

  private generateTimeBasedCode(prefix: string): string {
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    return `${prefix}${yyyy}${mm}${dd}${hh}${mi}${ss}`;
  }

  private collectTableKeys(rows: Array<Record<string, unknown>>): string[] {
    const keySet = new Set<string>();
    rows.forEach((row) => Object.keys(row).forEach((key) => keySet.add(key)));
    return Array.from(keySet).slice(0, 8);
  }

  private resolveId(row: Record<string, unknown>): string {
    return String(row['_id'] ?? row['id'] ?? row['codigo'] ?? '');
  }
}



