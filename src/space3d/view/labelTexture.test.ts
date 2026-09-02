import { describe, expect, it } from 'vitest';
import { labelTextureMetrics } from './threeViewport';

describe('etiquetas del visor espacial', () => {
  it('la caja nunca es más estrecha que la tinta que tiene que contener', () => {
    // El caso que se veía en pantalla: «2.70 kN» mide unos 180px con la fuente
    // de la etiqueta, y la caja fija de 128px lo recortaba a «2.7 k».
    const { width } = labelTextureMetrics(180);

    expect(width).toBeGreaterThanOrEqual(180);
    expect(width).toBeGreaterThan(128);
  });

  it('el sprite hereda la relación real de su textura y no una fija', () => {
    const corta = labelTextureMetrics(48);
    const larga = labelTextureMetrics(320);

    expect(larga.aspect).toBeGreaterThan(corta.aspect);
    expect(corta.aspect).toBeCloseTo(corta.width / corta.height, 10);
    expect(larga.aspect).toBeCloseTo(larga.width / larga.height, 10);
  });

  it('una medida inservible no produce una textura degenerada', () => {
    for (const medida of [0, -20, Number.NaN, Number.POSITIVE_INFINITY]) {
      const { width, height, aspect } = labelTextureMetrics(medida);
      expect(Number.isFinite(width) && width > 0).toBe(true);
      expect(Number.isFinite(height) && height > 0).toBe(true);
      expect(Number.isFinite(aspect) && aspect > 0).toBe(true);
    }
  });

  it('una etiqueta larguísima se topa con un techo en vez de devorar textura', () => {
    expect(labelTextureMetrics(20000).width).toBeLessThanOrEqual(768);
  });
});
