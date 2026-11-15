using System;
using System.Collections.Generic;
using System.Linq;
// Port: alpha-1/src/render/camera.ts
using Trzewia.Nastawy;
using static Trzewia.Nastawy.NastawySterowanie;

namespace Trzewia.Rysunek
{

/// <summary>Kamera w kaflach; zoom to liczba pikseli na kafel.</summary>
public sealed class Camera
{
    public double x = 0, y = 0, zoom = 6;
    public double minZoom = KAMERA.min, maxZoom = KAMERA.max;
    public double vw, vh;
    public Camera(double vw, double vh) { this.vw = vw; this.vh = vh; }

    /// <summary>Miękkie dojście do celu — kamera ma iść za tym, co się dzieje, nie stać w miejscu.</summary>
    public void drift(double tx, double ty, double k)
    {
        x += (tx - x) * k;
        y += (ty - y) * k;
    }

    public void clamp(double worldW, double worldH)
    {
        zoom = Math.Min(maxZoom, Math.Max(minZoom, zoom));
        double halfW = vw / zoom / 2, halfH = vh / zoom / 2;
        x = Math.Min(Math.Max(x, halfW), Math.Max(halfW, worldW - halfW));
        var minY = halfH - KAMERA.niebo;
        y = Math.Min(Math.Max(y, minY), Math.Max(minY, worldH - halfH));
    }

    public double toScreenX(double wx) => (wx - x) * zoom + vw / 2;
    public double toScreenY(double wy) => (wy - y) * zoom + vh / 2;
    public double toWorldX(double sx) => (sx - vw / 2) / zoom + x;
    public double toWorldY(double sy) => (sy - vh / 2) / zoom + y;
}
}
