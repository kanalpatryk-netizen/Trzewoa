package pl.gorahugona.granica;

import org.json.JSONArray;
import org.json.JSONException;

/**
 * Obszar jako wielokąt [[szer, dł], …]. Liczy na płaskim rzucie wokół środka obszaru
 * (na kilku kilometrach błąd to ułamki metra): czy punkt jest w środku i ile ma metrów
 * do najbliższego boku. To samo liczy mapa w app.js — trzymać oba miejsca zgodne.
 */
final class Granica {
    private final double szer0, dl0, kx, ky;
    private final double[] x, y;

    Granica(String json) throws JSONException {
        JSONArray a = new JSONArray(json);
        int n = a.length();
        if (n < 3) throw new JSONException("granica ma mniej niż 3 punkty");
        double s = 0, d = 0;
        double[] la = new double[n], lo = new double[n];
        for (int i = 0; i < n; i++) {
            JSONArray p = a.getJSONArray(i);
            la[i] = p.getDouble(0);
            lo[i] = p.getDouble(1);
            s += la[i];
            d += lo[i];
        }
        szer0 = s / n;
        dl0 = d / n;
        ky = 110574.0;
        kx = 111320.0 * Math.cos(Math.toRadians(szer0));
        x = new double[n];
        y = new double[n];
        for (int i = 0; i < n; i++) {
            x[i] = (lo[i] - dl0) * kx;
            y[i] = (la[i] - szer0) * ky;
        }
    }

    boolean wewnatrz(double szer, double dl) {
        double px = (dl - dl0) * kx, py = (szer - szer0) * ky;
        boolean w = false;
        for (int i = 0, j = x.length - 1; i < x.length; j = i++) {
            if ((y[i] > py) != (y[j] > py)
                && px < (x[j] - x[i]) * (py - y[i]) / (y[j] - y[i]) + x[i]) w = !w;
        }
        return w;
    }

    /** Metry do najbliższego boku granicy (bez znaku). */
    double odleglosc(double szer, double dl) {
        double px = (dl - dl0) * kx, py = (szer - szer0) * ky;
        double min = Double.MAX_VALUE;
        for (int i = 0, j = x.length - 1; i < x.length; j = i++) {
            double ax = x[j], ay = y[j], bx = x[i], by = y[i];
            double dx = bx - ax, dy = by - ay;
            double t = (dx == 0 && dy == 0) ? 0 : ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
            t = Math.max(0, Math.min(1, t));
            double ex = ax + t * dx - px, ey = ay + t * dy - py;
            min = Math.min(min, Math.sqrt(ex * ex + ey * ey));
        }
        return min;
    }
}
