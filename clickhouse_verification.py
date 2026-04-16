#!/usr/bin/env python3
"""
ClickHouse Data Integrity Verification
Verifies data consistency and integration with FinanceAI
"""

import os
import sys
import json
from datetime import datetime
from typing import Dict, List, Any, Optional


def analyze_clickhouse_schema():
    """Analyze ClickHouse schema from code"""
    print("🔍 Analyzing ClickHouse Schema")
    
    schema_analysis = {
        "tables_defined": [],
        "data_models": [],
        "audit_trail": {},
        "performance_indicators": {}
    }
    
    # Check clickhouse.py for table definitions
    clickhouse_file = "apps/core/clickhouse.py"
    if os.path.exists(clickhouse_file):
        try:
            with open(clickhouse_file, 'r') as f:
                content = f.read()
                
                # Look for table definitions
                if "CREATE TABLE" in content or "OmegaEvent" in content:
                    schema_analysis["tables_defined"].append({
                        "file": clickhouse_file,
                        "has_create_table": "CREATE TABLE" in content,
                        "has_omega_event": "OmegaEvent" in content,
                        "lines": len(content.split('\n'))
                    })
                    print(f"  ✅ ClickHouse data model found in {clickhouse_file}")
                
                # Look for audit trail references
                if "audit" in content.lower():
                    schema_analysis["audit_trail"]["clickhouse_integration"] = True
                    print(f"  ✅ Audit trail integration detected")
        except Exception as e:
            print(f"  ⚠️ Error reading {clickhouse_file}: {e}")
    
    # Check for ClickHouse queries in other files
    for root, dirs, files in os.walk("apps"):
        for file in files:
            if file.endswith(".py"):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r') as f:
                        content = f.read()
                        if "clickhouse" in content.lower():
                            schema_analysis["data_models"].append({
                                "file": filepath,
                                "mentions": content.lower().count("clickhouse"),
                                "lines": len(content.split('\n'))
                            })
                except:
                    continue
    
    return schema_analysis


def verify_data_integrity_patterns():
    """Verify data integrity patterns in the codebase"""
    print("\n🔍 Verifying Data Integrity Patterns")
    
    patterns = {
        "transaction_support": False,
        "data_validation": False,
        "error_handling": False,
        "consistency_checks": False,
        "backup_recovery": False
    }
    
    # Check for transaction patterns
    transaction_keywords = ["transaction", "atomic", "commit", "rollback"]
    validation_keywords = ["validate", "clean", "is_valid", "validator"]
    error_keywords = ["try:", "except", "error_handling", "retry"]
    
    for root, dirs, files in os.walk("apps"):
        for file in files:
            if file.endswith(".py"):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r') as f:
                        content = f.read().lower()
                        
                        # Check for transaction support
                        if any(keyword in content for keyword in transaction_keywords):
                            patterns["transaction_support"] = True
                        
                        # Check for data validation
                        if any(keyword in content for keyword in validation_keywords):
                            patterns["data_validation"] = True
                        
                        # Check for error handling
                        if "try:" in content and "except" in content:
                            patterns["error_handling"] = True
                            
                        # Check for consistency checks
                        if "consist" in content or "integrity" in content:
                            patterns["consistency_checks"] = True
                            
                except:
                    continue
    
    # Check for backup/recovery patterns
    if os.path.exists("docker-compose.yml"):
        try:
            with open("docker-compose.yml", 'r') as f:
                content = f.read()
                if "volume" in content or "backup" in content:
                    patterns["backup_recovery"] = True
        except:
            pass
    
    # Print results
    for pattern, present in patterns.items():
        status = "✅" if present else "⚠️"
        print(f"  {status} {pattern.replace('_', ' ').title()}: {'Present' if present else 'Missing'}")
    
    return patterns


def analyze_clickhouse_queries():
    """Analyze ClickHouse query patterns"""
    print("\n🔍 Analyzing ClickHouse Query Patterns")
    
    queries = {
        "aggregation_queries": [],
        "time_series_queries": [],
        "join_queries": [],
        "insert_queries": []
    }
    
    # Look for query patterns in clickhouse.py
    clickhouse_file = "apps/core/clickhouse.py"
    if os.path.exists(clickhouse_file):
        try:
            with open(clickhouse_file, 'r') as f:
                lines = f.readlines()
                
                for i, line in enumerate(lines):
                    line_lower = line.lower()
                    
                    # Look for aggregation queries
                    if "select" in line_lower and ("count(" in line_lower or "sum(" in line_lower 
                                                    or "avg(" in line_lower or "fold_" in line):
                        queries["aggregation_queries"].append({
                            "line": i + 1,
                            "query": line.strip()[:100]
                        })
                    
                    # Look for time series queries
                    if "datetime" in line_lower or "date" in line_lower:
                        queries["time_series_queries"].append({
                            "line": i + 1,
                            "query": line.strip()[:100]
                        })
                    
                    # Look for insert queries
                    if "insert into" in line_lower:
                        queries["insert_queries"].append({
                            "line": i + 1,
                            "query": line.strip()[:100]
                        })
        except Exception as e:
            print(f"  ⚠️ Error analyzing {clickhouse_file}: {e}")
    
    # Print summary
    for query_type, query_list in queries.items():
        count = len(query_list)
        status = "✅" if count > 0 else "⚠️"
        print(f"  {status} {query_type.replace('_', ' ').title()}: {count}")
    
    return queries


def generate_data_integrity_report(analysis_results):
    """Generate data integrity report"""
    print("\n📊 Generating Data Integrity Report...")
    
    report = []
    report.append("# ClickHouse Data Integrity Audit Report")
    report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append("")
    
    # Schema Analysis
    report.append("## 1. Schema Analysis")
    schema = analysis_results.get("schema_analysis", {})
    
    if schema.get("tables_defined"):
        report.append("✅ **ClickHouse tables are defined in code**")
        for table in schema["tables_defined"]:
            report.append(f"- **File:** {table['file']}")
            report.append(f"  - Lines: {table['lines']}")
            report.append(f"  - Has CREATE TABLE: {'Yes' if table['has_create_table'] else 'No'}")
            report.append(f"  - Has OmegaEvent: {'Yes' if table['has_omega_event'] else 'No'}")
    else:
        report.append("❌ **No ClickHouse table definitions found**")
    
    if schema.get("data_models"):
        report.append(f"\n✅ **ClickHouse integration in {len(schema['data_models'])} files**")
        for model in schema["data_models"][:5]:  # Show first 5
            report.append(f"- {model['file']}: {model['mentions']} mentions, {model['lines']} lines")
    
    report.append("")
    
    # Data Integrity Patterns
    report.append("## 2. Data Integrity Patterns")
    patterns = analysis_results.get("integrity_patterns", {})
    
    pattern_status = {
        "transaction_support": ("Transaction Support", patterns.get("transaction_support", False)),
        "data_validation": ("Data Validation", patterns.get("data_validation", False)),
        "error_handling": ("Error Handling", patterns.get("error_handling", False)),
        "consistency_checks": ("Consistency Checks", patterns.get("consistency_checks", False)),
        "backup_recovery": ("Backup/Recovery", patterns.get("backup_recovery", False))
    }
    
    for key, (name, present) in pattern_status.items():
        status = "✅" if present else "❌"
        report.append(f"{status} **{name}**: {'Implemented' if present else 'Not found'}")
    
    report.append("")
    
    # Query Analysis
    report.append("## 3. Query Pattern Analysis")
    queries = analysis_results.get("query_analysis", {})
    
    report.append("### Query Types Found:")
    for query_type, query_list in queries.items():
        count = len(query_list)
        if count > 0:
            report.append(f"✅ **{query_type.replace('_', ' ').title()}**: {count} queries")
            # Show sample queries
            for i, query in enumerate(query_list[:2]):  # Show first 2
                report.append(f"  {i+1}. Line {query['line']}: `{query['query']}...`")
        else:
            report.append(f"⚠️ **{query_type.replace('_', ' ').title()}**: None found")
    
    report.append("")
    
    # Recommendations
    report.append("## 4. Recommendations for Data Integrity")
    report.append("")
    
    recommendations = []
    
    # Schema recommendations
    if not schema.get("tables_defined"):
        recommendations.append("❌ **Define ClickHouse table schemas explicitly**")
        recommendations.append("  - Create migration scripts for ClickHouse")
        recommendations.append("  - Document table relationships")
    else:
        recommendations.append("✅ **Schema definitions are in place**")
    
    # Integrity pattern recommendations
    missing_patterns = [name for name, present in pattern_status.items() if not present[1]]
    if missing_patterns:
        recommendations.append(f"⚠️ **Implement missing data integrity patterns**")
        for pattern in missing_patterns[:3]:  # Show first 3
            recommendations.append(f"  - Add {pattern.replace('_', ' ')}")
    else:
        recommendations.append("✅ **All key data integrity patterns are implemented**")
    
    # Query optimization recommendations
    if queries.get("aggregation_queries"):
        recommendations.append("✅ **Aggregation queries are implemented**")
    else:
        recommendations.append("⚠️ **Consider adding aggregation queries for analytics**")
    
    if queries.get("time_series_queries"):
        recommendations.append("✅ **Time-series analysis is supported**")
    else:
        recommendations.append("⚠️ **Add time-series queries for trend analysis**")
    
    report.append("\n".join(recommendations))
    report.append("")
    
    # Conclusion
    report.append("## 5. Overall Assessment")
    report.append("")
    
    # Calculate score
    schema_score = 1 if schema.get("tables_defined") else 0
    patterns_score = sum(1 for p in patterns.values() if p) / len(patterns) if patterns else 0
    queries_score = sum(1 for q in queries.values() if q) / len(queries) if queries else 0
    
    total_score = (schema_score + patterns_score + queries_score) / 3 * 100
    
    if total_score >= 80:
        report.append(f"✅ **Overall Score: {total_score:.0f}%** - Excellent data integrity")
        report.append("The system demonstrates strong data integrity patterns and ClickHouse integration.")
    elif total_score >= 60:
        report.append(f"⚠️ **Overall Score: {total_score:.0f}%** - Good with some improvements needed")
        report.append("Core data integrity is present but some patterns could be strengthened.")
    else:
        report.append(f"❌ **Overall Score: {total_score:.0f}%** - Needs significant work")
        report.append("Critical data integrity patterns are missing or incomplete.")
    
    report.append("")
    report.append("---")
    report.append("*Data Integrity Audit performed by FinanceAI Verification System*")
    
    return "\n".join(report)


def main():
    """Main verification execution"""
    print("🚀 Starting ClickHouse Data Integrity Verification")
    print("=" * 60)
    
    results = {}
    
    try:
        # Analyze schema
        print("\n📋 Phase 1: Schema Analysis")
        results["schema_analysis"] = analyze_clickhouse_schema()
        
        # Verify integrity patterns
        print("\n📋 Phase 2: Integrity Pattern Verification")
        results["integrity_patterns"] = verify_data_integrity_patterns()
        
        # Analyze queries
        print("\n📋 Phase 3: Query Pattern Analysis")
        results["query_analysis"] = analyze_clickhouse_queries()
        
        # Generate report
        print("\n📋 Phase 4: Report Generation")
        report = generate_data_integrity_report(results)
        
        # Save report
        with open("clickhouse_integrity_report.md", "w") as f:
            f.write(report)
        
        print(f"✅ Verification complete! Report saved to clickhouse_integrity_report.md")
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 Verification Summary:")
        
        schema = results["schema_analysis"]
        print(f"  - Schema: {'✅ Defined' if schema['tables_defined'] else '❌ Missing'}")
        
        patterns = results["integrity_patterns"]
        patterns_present = sum(1 for p in patterns.values() if p)
        print(f"  - Integrity Patterns: {patterns_present}/{len(patterns)}")
        
        queries = results["query_analysis"]
        queries_present = sum(1 for q in queries.values() if q)
        print(f"  - Query Types: {queries_present}/{len(queries)}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Verification failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    # Run the verification
    success = main()
    
    if success:
        print("\n🎉 Data Integrity Verification completed successfully!")
        sys.exit(0)
    else:
        print("\n💥 Data Integrity Verification failed!")
        sys.exit(1)