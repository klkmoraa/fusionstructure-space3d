import { describe, expect, it } from 'vitest';
import { labelTextureMetrics, parseGizmoInset, worldAxesViewport } from './threeViewport';

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

describe('brújula de ejes del visor espacial', () => {
  it('se apoya en la esquina inferior izquierda y crece con el lienzo, con tope', () => {
    const telefono = worldAxesViewport(390, 844);
    const escritorio = worldAxesViewport(1440, 900);

    expect(telefono.x).toBeGreaterThan(0);
    expect(telefono.y).toBeGreaterThan(0);
    expect(escritorio.size).toBeGreaterThan(telefono.size);
    expect(escritorio.size).toBeLessThanOrEqual(124);
    expect(telefono.size).toBeGreaterThanOrEqual(64);
  });

  it('sube sobre el hueco que le reserva la hoja de estilos', () => {
    // En teléfono la barra de resultados ocupa la esquina: sin el hueco, la
    // brújula quedaba tapada por ella.
    const sinHueco = worldAxesViewport(390, 844);
    const conHueco = worldAxesViewport(390, 844, 62);

    expect(conHueco.y - sinHueco.y).toBe(62);
    expect(conHueco.x).toBe(sinHueco.x);
    expect(conHueco.size).toBe(sinHueco.size);
  });

  it('un lienzo o un hueco inservibles no producen un recuadro degenerado', () => {
    for (const [w, h, inset] of [[0, 0, 0], [Number.NaN, 844, 10], [390, 844, Number.NaN], [390, 844, -40]] as const) {
      const box = worldAxesViewport(w, h, inset);
      expect(Number.isFinite(box.x) && box.x >= 0).toBe(true);
      expect(Number.isFinite(box.y) && box.y >= 0).toBe(true);
      expect(Number.isFinite(box.size) && box.size > 0).toBe(true);
    }
  });

  it('el hueco se lee de la hoja de estilos y no se inventa', () => {
    expect(parseGizmoInset('62px')).toBe(62);
    expect(parseGizmoInset('0px')).toBe(0);
    expect(parseGizmoInset('')).toBe(0);
    expect(parseGizmoInset('auto')).toBe(0);
  });
});
