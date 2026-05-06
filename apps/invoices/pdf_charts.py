# apps/invoices/pdf_charts.py
import io
from typing import List, Dict, Any
import math

# Simple utility to format large numbers into INR notation for PDF display
def fmt_inr(amount: float) -> str:
    if amount is None:
        return "₹0"
    amount = abs(amount)
    if amount >= 1000000000:  # Billions (100 Cr)
        return f"₹{amount / 1000000000:.2f}B"
    if amount >= 10000000:  # Crores (1 Cr = 10,000,000)
        return f"₹{amount / 10000000:.2f}Cr"
    if amount >= 100000:  # Lakhs (1 Lakh = 100,000)
        return f"₹{amount / 100000:.1f}L"
    if amount >= 1000:
        return f"₹{amount / 1000:.0f}K"
    return f"₹{amount:,.0f}"

def bar_chart_svg(
    data: List[Dict[str, Any]],
    value_key: str,
    label_key: str,
    height: int = 150,
    width: int = 400,
    bar_color: str = "#3B82F6",
    track_color: str = "#E2E8F0"
) -> str:
    """Generates SVG for a simple horizontal bar chart."""
    if not data:
        return f'<svg width="{width}" height="{height}"><text x="10" y="20" font-size="12">No data available</text></svg>'

    max_val = max(item.get(value_key, 0) for item in data)
    if max_val == 0: max_val = 1
    
    num_items = len(data)
    padding = 20
    bar_height = (height - 2 * padding) / num_items
    
    svg_content = f'<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">'
    svg_content += f'<style> .label {{ font-size: 11px; fill: #475569; font-family: "Plus Jakarta Sans", sans-serif; }} .num {{ font-size: 11px; font-weight: 700; fill: #0F172A; font-family: "Bricolage Grotesque", sans-serif; }} </style>'

    y_pos = padding
    for item in data:
        label = item.get(label_key, "N/A")
        value = item.get(value_key, 0)
        
        bar_width = (value / max_val) * (width - 2 * padding - 80)
        
        # Track background
        svg_content += f'<rect x="{padding}" y="{y_pos}" width="{width - 2 * padding - 80}" height="{bar_height * 0.7}" fill="{track_color}" rx="3" ry="3" />'
        
        # Value bar
        svg_content += f'<rect x="{padding}" y="{y_pos}" width="{bar_width}" height="{bar_height * 0.7}" fill="{bar_color}" rx="3" ry="3" />'
        
        # Label
        svg_content += f'<text x="{padding - 10}" y="{y_pos + bar_height * 0.6}" text-anchor="end" class="label">{label}</text>'
        
        # Value
        svg_content += f'<text x="{padding + bar_width + 10}" y="{y_pos + bar_height * 0.6}" text-anchor="start" class="num">{fmt_inr(value)}</text>'
        
        y_pos += bar_height
        
    svg_content += '</svg>'
    return svg_content

def line_chart_svg(
    series: List[Dict[str, Any]],
    labels: List[str],
    height: int = 200,
    width: int = 600,
    padding_top: int = 20,
    padding_bottom: int = 30,
    padding_left: int = 40,
    padding_right: int = 20,
) -> str:
    """Generates SVG for a simple line chart with area fill."""
    if not series or not labels:
        return f'<svg width="{width}" height="{height}"><text x="10" y="20" font-size="12">No trend data.</text></svg>'

    all_values = []
    for s in series:
        all_values.extend(s['data'])
    
    min_y = min(all_values) if all_values else 0
    max_y = max(all_values) if all_values else 1
    
    # Add buffer to Y scale
    y_range = max_y - min_y
    y_buffer = y_range * 0.1 if y_range > 0 else 10
    scale_min = min_y - y_buffer
    scale_max = max_y + y_buffer
    
    chart_h = height - padding_top - padding_bottom
    chart_w = width - padding_left - padding_right
    
    def map_x(i):
        return padding_left + (i / (len(labels) - 1)) * chart_w if len(labels) > 1 else padding_left

    def map_y(val):
        return padding_top + chart_h - ((val - scale_min) / (scale_max - scale_min)) * chart_h

    svg_content = f'<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}">'
    svg_content += f'<style> .axis-label {{ font-size: 10px; fill: #94A3B8; font-family: "Plus Jakarta Sans", sans-serif; }} .data-label {{ font-size: 9px; fill: #475569; font-family: "Plus Jakarta Sans", sans-serif; }} </style>'

    # 1. Draw Axes (Y-axis only for simplicity, X-axis is implicit via labels below)
    svg_content += f'<line x1="{padding_left}" y1="{padding_top}" x2="{padding_left}" y2="{height - padding_bottom}" stroke="#E2E8F0" stroke-width="1"/>'
    svg_content += f'<line x1="{padding_left}" y1="{height - padding_bottom}" x2="{width - padding_right}" y2="{height - padding_bottom}" stroke="#E2E8F0" stroke-width="1"/>'
    
    # Y-Axis Labels (Draw 3 ticks)
    for i in range(3):
        tick_val = scale_min + (scale_max - scale_min) * (i / 2)
        y_coord = map_y(tick_val)
        svg_content += f'<text x="{padding_left - 10}" y="{y_coord + 4}" text-anchor="end" class="axis-label">{fmt_inr(tick_val)}</text>'
        svg_content += f'<line x1="{padding_left - 5}" y1="{y_coord}" x2="{padding_left}" y2="{y_coord}" stroke="#E2E8F0" stroke-width="1"/>'

    # 2. Draw Data Series (Assuming only one series for simplicity as per analysis)
    series_data = series[0] # Focus on the first series
    color = series_data['color']
    path_points = []
    
    for i, val in enumerate(series_data['data']):
        x = map_x(i)
        y = map_y(val)
        path_points.append(f"{x},{y}")
        
        # Data point (optional, small dot)
        svg_content += f'<circle cx="{x}" cy="{y}" r="2.5" fill="{color}" stroke="white" stroke-width="1"/>'

    # Create the line path
    line_path = " ".join(path_points)
    svg_content += f'<polyline points="{line_path}" fill="none" stroke="{color}" stroke-width="2" />'
    
    # Area Fill (Area under the curve)
    area_path = f"{map_x(0)},{height - padding_bottom} " + line_path + f" {map_x(len(labels)-1)},{height - padding_bottom}"
    svg_content += f'<polygon points="{area_path}" fill="{color}" fill-opacity="0.15"/>'

    # 3. X-Axis Labels (Place every 4th label, or all if small dataset)
    num_labels = len(labels)
    step = max(1, num_labels // 5) # Show about 5 labels max
    
    for i, label in enumerate(labels):
        if i % step == 0 or i == num_labels - 1:
            x_coord = map_x(i)
            y_coord = height - padding_bottom + 15
            svg_content += f'<text x="{x_coord}" y="{y_coord}" text-anchor="middle" class="axis-label">{label}</text>'

    svg_content += '</svg>'
    return svg_content

def donut_chart_svg(
    slices: List[Dict[str, Any]],
    size: int = 150,
    stroke_width: int = 20,
) -> str:
    """Generates SVG for a donut chart."""
    if not slices:
        return f'<svg width="{size}" height="{size}"><text x="{size/2}" y="{size/2}" text-anchor="middle" font-size="12">No data</text></svg>'

    total = sum(s['value'] for s in slices)
    radius = (size - stroke_width) / 2
    center = size / 2
    
    # Center text (used for total value or label)
    center_text = f'{len(slices)} Categories'
    
    svg_content = f'<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" xmlns="http://www.w3.org/2000/svg">'
    svg_content += f'<style> .label {{ font-size: 10px; fill: #475569; font-family: "Plus Jakarta Sans", sans-serif; }} .center-text {{ font-size: 12px; font-weight: 800; fill: #0F172A; font-family: "Bricolage Grotesque", sans-serif; }} </style>'
    
    cumulative_percentage = 0.0
    
    for slice in slices:
        percentage = slice['value'] / total
        start_angle = cumulative_percentage * 360
        end_angle = (cumulative_percentage + percentage) * 360
        
        cumulative_percentage += percentage
        
        # SVG path generation for arc segment
        def polar_to_cartesian(angle_in_degrees):
            angle_in_radians = (angle_in_degrees - 90) * math.pi / 180.0
            return {
                "x": center + (radius * math.cos(angle_in_radians)),
                "y": center + (radius * math.sin(angle_in_radians))
            }

        def describe_arc(x, y, radius, start_angle, end_angle):
            start = polar_to_cartesian(start_angle)
            end = polar_to_cartesian(end_angle)
            
            large_arc_flag = 1 if end_angle - start_angle > 180 else 0
            
            d = [
                "M", start.x, start.y, 
                "A", radius, radius, 0, large_arc_flag, 0, end.x, end.y
            ]
            return " ".join(map(str, d))

        # Check if arc is a full circle (to avoid drawing errors)
        if percentage < 1.0 or total == slice['value']:
            path_data = describe_arc(center, center, radius, start_angle, end_angle)
            svg_content += f'<path d="{path_data}" fill="{slice["color"]}" />'

    # Center circle (to create the donut hole)
    inner_radius = radius - stroke_width
    svg_content += f'<circle cx="{center}" cy="{center}" r="{inner_radius}" fill="white" />'
    
    # Center text
    svg_content += f'<text x="{center}" y="{center - 5}" text-anchor="middle" class="center-text">{fmt_inr(total)}</text>'
    svg_content += f'<text x="{center}" y="{center + 15}" text-anchor="middle" class="label">Total OpEx</text>'

    svg_content += '</svg>'
    return svg_content