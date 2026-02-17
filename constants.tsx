
import React from 'react';
import { ProductClass } from './types';

export const PRODUCT_CLASSES = Object.values(ProductClass);

export const CLASS_ICONS: Record<ProductClass, string> = {
  [ProductClass.Medicamentos]: 'medication',
  [ProductClass.MaterialHospitalar]: 'medical_information',
  [ProductClass.EPI]: 'mask',
  [ProductClass.Grafica]: 'print',
  [ProductClass.Papelaria]: 'description',
  [ProductClass.Dieta]: 'restaurant',
  [ProductClass.QuimicosDescartaveis]: 'science',
  [ProductClass.Utensilios]: 'flatware',
  [ProductClass.EquipamentosMedicos]: 'medical_services',
};
