"""
Pure-Python SVG chart generators for WeasyPrint PDF reports.
All functions return a UTF-8 SVG string safe to embed as {{ chart | safe }}.
No external dependencies beyond the stdlib.
"""
import math

COLORS = [
    '#E8783B', '#F59E0B', '#10B981', '#3B82F6',
    '#8B5CF6', '#EF4444', '#06B6D4', '#84CC16',
]

STATUS_COLORS = {
    'OVER_BUDGET': '#EF4444',
    'ON_TRACK':    '#10B981',
    'UNDER_BUDGET': '#3B82F6',
}


def fmt_inr(v):
    """Format a number as Indian Rupee shorthand."""
    try:
        v = float(v or 0)
    except (TypeError, ValueError):
        return '₹0'
    if v >= 10_000_000:
        return f'₹{v / 10_000_000:.2f}Cr'
    if v >= 100_000:
        return f'₹{v / 100_000:.1f}L'
    if v >= 1_000:
        return f'₹{v / 1_000:.0f}K'
    return f'₹{v:.0f}'


def _no_data(width, height):
    cx, cy = width // 2, height // 2
    return (
        f'<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">'
        f'<text x="{cx}" y="{cy}" text-anchor="middle" dominant-baseline="middle" '
        f'font-size="11" fill="#94A3B8" font-family="Helvetica Neue,Arial,sans-serif">'
        f'No data available</text></svg>'
    )


def bar_chart_svg(data, width=520, label_width=140, color='#E8783B', show_value=True):
    """
    Horizontal bar chart.
    data = [{'label': str, 'value': float, 'color': str (optional)}]
    """
    if not data:
        return _no_data(width, 60)

    bar_h   = 22
    bar_gap = 10
    pad_v   = 14
    val_w   = 72
    bar_area = width - label_width - val_w - 4

    max_val = max(float(d.get('value', 0)) for d in data) or 1
    total_h = len(data) * (bar_h + bar_gap) - bar_gap + pad_v * 2

    parts = [
        f'<svg width="{width}" height="{total_h}" '
        f'xmlns="http://www.w3.org/2000/svg" '
        f'font-family="Helvetica Neue,Arial,sans-serif">'
    ]

    for i, d in enumerate(data):
        y   = pad_v + i * (bar_h + bar_gap)
        val = float(d.get('value', 0))
        pct = val / max_val
        bar_w = max(3.0, pct * bar_area)
        c   = d.get('color') or color
        lbl = str(d.get('label', ''))
        if len(lbl) > 20:
            lbl = lbl[:18] + '…'

        mid_y = f'{y + bar_h / 2 + 4:.1f}'

        # bg track
        parts.append(
            f'<rect x="{label_width}" y="{y}" width="{bar_area}" height="{bar_h}" '
            f'rx="4" fill="#F1F5F9"/>'
        )
        # value bar
        parts.append(
            f'<rect x="{label_width}" y="{y}" width="{bar_w:.1f}" height="{bar_h}" '
            f'rx="4" fill="{c}" opacity="0.88"/>'
        )
        # label
        parts.append(
            f'<text x="{label_width - 7}" y="{mid_y}" text-anchor="end" '
            f'font-size="11" fill="#475569" font-weight="600">{lbl}</text>'
        )
        # value
        if show_value:
            parts.append(
                f'<text x="{label_width + bar_area + 6}" y="{mid_y}" '
                f'font-size="11" fill="{c}" font-weight="800">{fmt_inr(val)}</text>'
            )

    parts.append('</svg>')
    return ''.join(parts)


def line_chart_svg(labels, values, prev_values=None,
                   width=520, height=200,
                   color='#E8783B', prev_color='#CBD5E1'):
    """
    Line/area chart with optional prior-year dashed overlay.
    labels      = list of str
    values      = list of float (current year)
    prev_values = list of float (prior year, optional)
    """
    if not labels or not values:
        return _no_data(width, height)

    pad_l, pad_r, pad_t, pad_b = 44, 16, 20, 32
    cw = width  - pad_l - pad_r
    ch = height - pad_t - pad_b

    all_v  = list(values) + (list(prev_values) if prev_values else [])
    max_v  = max(all_v) * 1.1 if max(all_v) > 0 else 1
    n      = len(labels)

    def xy(i, v):
        x = pad_l + (i / max(n - 1, 1)) * cw
        y = pad_t + (1.0 - v / max_v) * ch
        return round(x, 1), round(y, 1)

    parts = [
        f'<svg width="{width}" height="{height}" '
        f'xmlns="http://www.w3.org/2000/svg" '
        f'font-family="Helvetica Neue,Arial,sans-serif">'
    ]

    # horizontal grid lines (4)
    for k in range(5):
        yg = pad_t + (k / 4) * ch
        vg = max_v * (1 - k / 4)
        parts.append(
            f'<line x1="{pad_l}" y1="{yg:.1f}" x2="{pad_l + cw}" y2="{yg:.1f}" '
            f'stroke="#F1F5F9" stroke-width="1"/>'
        )
        parts.append(
            f'<text x="{pad_l - 4}" y="{yg + 3:.1f}" text-anchor="end" '
            f'font-size="8" fill="#CBD5E1">{fmt_inr(vg)}</text>'
        )

    def _area_polygon(pts, base_y):
        top  = ' '.join(f'{x},{y}' for x, y in pts)
        bl   = f'{pts[0][0]},{base_y}'
        br   = f'{pts[-1][0]},{base_y}'
        return f'{bl} {top} {br}'

    base_y = pad_t + ch

    # prior year
    if prev_values and len(prev_values) == n:
        prev_pts = [xy(i, v) for i, v in enumerate(prev_values)]
        poly     = _area_polygon(prev_pts, base_y)
        line_pts = ' '.join(f'{x},{y}' for x, y in prev_pts)
        parts.append(f'<polygon points="{poly}" fill="{prev_color}" opacity="0.12"/>')
        parts.append(
            f'<polyline points="{line_pts}" fill="none" stroke="{prev_color}" '
            f'stroke-width="1.5" stroke-dasharray="4 3"/>'
        )

    # current year
    curr_pts = [xy(i, v) for i, v in enumerate(values)]
    poly     = _area_polygon(curr_pts, base_y)
    line_pts = ' '.join(f'{x},{y}' for x, y in curr_pts)
    parts.append(f'<polygon points="{poly}" fill="{color}" opacity="0.10"/>')
    parts.append(
        f'<polyline points="{line_pts}" fill="none" stroke="{color}" stroke-width="2.5"/>'
    )
    for x, y in curr_pts:
        parts.append(
            f'<circle cx="{x}" cy="{y}" r="3" fill="{color}" '
            f'stroke="white" stroke-width="1.5"/>'
        )

    # x-axis labels (show every nth to avoid overlap)
    step = max(1, n // 7)
    for i, lbl in enumerate(labels):
        if i % step == 0 or i == n - 1:
            x, _ = xy(i, 0)
            parts.append(
                f'<text x="{x}" y="{base_y + 14}" text-anchor="middle" '
                f'font-size="9" fill="#94A3B8">{lbl}</text>'
            )

    # axis line
    parts.append(
        f'<line x1="{pad_l}" y1="{base_y}" x2="{pad_l + cw}" y2="{base_y}" '
        f'stroke="#E2E8F0" stroke-width="1"/>'
    )

    parts.append('</svg>')
    return ''.join(parts)


def donut_chart_svg(slices, size=160):
    """
    Donut chart using the SVG stroke-dasharray technique.
    slices = [{'label': str, 'value': float, 'color': str (optional)}]
    """
    if not slices:
        return _no_data(size, size)

    total = sum(float(s.get('value', 0)) for s in slices)
    if total == 0:
        return _no_data(size, size)

    cx = cy = size / 2
    r  = size * 0.32
    sw = r * 0.52
    C  = 2 * math.pi * r

    parts = [
        f'<svg width="{size}" height="{size}" '
        f'xmlns="http://www.w3.org/2000/svg" '
        f'font-family="Helvetica Neue,Arial,sans-serif">'
    ]

    # background ring
    parts.append(
        f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" '
        f'fill="none" stroke="#F1F5F9" stroke-width="{sw:.1f}"/>'
    )

    acc = 0.0
    for i, s in enumerate(slices[:8]):
        val = float(s.get('value', 0))
        pct = val / total
        if pct < 0.005:
            acc += pct
            continue
        dash   = pct * C
        color  = s.get('color') or COLORS[i % len(COLORS)]
        offset = -(acc * C)

        parts.append(
            f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" '
            f'fill="none" stroke="{color}" stroke-width="{sw:.1f}" '
            f'stroke-dasharray="{dash:.2f} {C:.2f}" '
            f'stroke-dashoffset="{offset:.2f}" '
            f'transform="rotate(-90 {cx:.1f} {cy:.1f})"/>'
        )
        acc += pct

    # center label
    fs_big = max(9, int(size * 0.1))
    fs_sml = max(7, int(size * 0.07))
    top_pct = round(slices[0]['value'] / total * 100, 0) if slices else 0
    top_lbl = str(slices[0].get('label', ''))[:10] if slices else ''
    parts.append(
        f'<text x="{cx:.1f}" y="{cy - 2:.1f}" text-anchor="middle" '
        f'font-size="{fs_big}" font-weight="bold" fill="#0F172A">{top_pct:.0f}%</text>'
    )
    parts.append(
        f'<text x="{cx:.1f}" y="{cy + fs_sml + 3:.1f}" text-anchor="middle" '
        f'font-size="{fs_sml}" fill="#64748B">{top_lbl}</text>'
    )

    parts.append('</svg>')
    return ''.join(parts)


def progress_ring_svg(pct, size=88, color='#E8783B', label='', sub=''):
    """Single ring gauge — shows a percentage with optional label below."""
    cx = cy = size / 2
    r  = size * 0.38
    sw = size * 0.10
    C  = 2 * math.pi * r
    p  = max(0.0, min(100.0, float(pct or 0)))
    dash = (p / 100) * C

    parts = [
        f'<svg width="{size}" height="{size}" '
        f'xmlns="http://www.w3.org/2000/svg" '
        f'font-family="Helvetica Neue,Arial,sans-serif">'
    ]
    parts.append(
        f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" '
        f'fill="none" stroke="#F1F5F9" stroke-width="{sw:.1f}"/>'
    )
    if p > 0:
        gap = C - dash
        parts.append(
            f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" '
            f'fill="none" stroke="{color}" stroke-width="{sw:.1f}" '
            f'stroke-linecap="round" '
            f'stroke-dasharray="{dash:.2f} {gap:.2f}" '
            f'transform="rotate(-90 {cx:.1f} {cy:.1f})"/>'
        )

    fs_pct = max(9, int(size * 0.16))
    fs_lbl = max(7, int(size * 0.10))
    parts.append(
        f'<text x="{cx:.1f}" y="{cy + fs_pct * 0.38:.1f}" text-anchor="middle" '
        f'font-size="{fs_pct}" font-weight="bold" fill="{color}">{p:.0f}%</text>'
    )
    if label:
        parts.append(
            f'<text x="{cx:.1f}" y="{cy + fs_pct * 0.38 + fs_lbl + 3:.1f}" '
            f'text-anchor="middle" font-size="{fs_lbl}" fill="#64748B">{label}</text>'
        )

    parts.append('</svg>')
    return ''.join(parts)


def grouped_bar_chart_svg(labels, series, series_colors=None,
                           width=460, height=200, series_labels=None):
    """
    Grouped vertical bar chart (e.g. quarterly current vs prior year).
    labels        = ['Q1','Q2','Q3','Q4']
    series        = [[v1,v2,v3,v4], [v1,v2,v3,v4]]  (current, prior)
    series_colors = list of hex colors
    series_labels = ['FY 2026', 'FY 2025']
    """
    if not labels or not series:
        return _no_data(width, height)

    if series_colors is None:
        series_colors = ['#E8783B', '#CBD5E1']

    n_grp = len(labels)
    n_ser = len(series)

    pad_l, pad_r, pad_t, pad_b = 40, 16, 20, 36
    cw = width  - pad_l - pad_r
    ch = height - pad_t - pad_b

    all_v = [v for s in series for v in s]
    max_v = max(all_v) * 1.15 if max(all_v) > 0 else 1

    grp_w    = cw / n_grp
    bar_w    = grp_w * 0.62 / n_ser
    bar_gap  = grp_w * 0.06

    parts = [
        f'<svg width="{width}" height="{height}" '
        f'xmlns="http://www.w3.org/2000/svg" '
        f'font-family="Helvetica Neue,Arial,sans-serif">'
    ]

    # grid
    for k in range(4):
        yg = pad_t + (k / 3) * ch
        parts.append(
            f'<line x1="{pad_l}" y1="{yg:.1f}" x2="{pad_l + cw}" y2="{yg:.1f}" '
            f'stroke="#F1F5F9" stroke-width="1"/>'
        )

    for g, lbl in enumerate(labels):
        grp_x = pad_l + g * grp_w + grp_w * 0.19
        for s_idx, s_vals in enumerate(series):
            val  = float(s_vals[g]) if g < len(s_vals) else 0
            bh   = (val / max_v) * ch
            bx   = grp_x + s_idx * (bar_w + bar_gap)
            by   = pad_t + ch - bh
            c    = series_colors[s_idx % len(series_colors)]
            parts.append(
                f'<rect x="{bx:.1f}" y="{by:.1f}" width="{bar_w:.1f}" '
                f'height="{bh:.1f}" rx="2" fill="{c}" opacity="0.9"/>'
            )

        # x label
        lx = pad_l + g * grp_w + grp_w / 2
        parts.append(
            f'<text x="{lx:.1f}" y="{pad_t + ch + 14}" text-anchor="middle" '
            f'font-size="11" fill="#475569" font-weight="700">{lbl}</text>'
        )

    # axis
    parts.append(
        f'<line x1="{pad_l}" y1="{pad_t + ch}" x2="{pad_l + cw}" y2="{pad_t + ch}" '
        f'stroke="#E2E8F0" stroke-width="1"/>'
    )

    # legend (top right)
    if series_labels:
        lx = pad_l + cw - 10
        for si, sl in enumerate(reversed(series_labels)):
            c = series_colors[(n_ser - 1 - si) % len(series_colors)]
            ly = pad_t + 6 + si * 14
            parts.append(
                f'<rect x="{lx - 60:.1f}" y="{ly}" width="8" height="8" rx="2" fill="{c}"/>'
            )
            parts.append(
                f'<text x="{lx - 48}" y="{ly + 7}" font-size="9" fill="#64748B">{sl}</text>'
            )

    parts.append('</svg>')
    return ''.join(parts)
