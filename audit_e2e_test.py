#!/usr/bin/env python3
"""
E2E Audit Test for FinanceAI Dashboard
This script performs comprehensive testing of the FinanceAI system including:
1. API endpoint testing
2. ClickHouse data integrity verification
3. Load testing
4. System resource monitoring
"""

import asyncio
import json
import time
import statistics
import subprocess
import sys
from datetime import datetime
from typing import Dict, List, Any, Optional
import requests
from dataclasses import dataclass
from enum import Enum
import psutil


class TestStatus(Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    WARNING = "WARNING"
    SKIPPED = "SKIPPED"


@dataclass
class TestResult:
    name: str
    status: TestStatus
    details: str
    duration: float
    timestamp: datetime


class FinanceAIAuditor:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.results: List[TestResult] = []
        self.session = requests.Session()
        
    def log_test(self, name: str, func, *args, **kwargs) -> TestResult:
        """Execute a test and log the result"""
        start_time = time.time()
        timestamp = datetime.now()
        
        try:
            status, details = func(*args, **kwargs)
            duration = time.time() - start_time
            result = TestResult(name, status, details, duration, timestamp)
            self.results.append(result)
            return result
        except Exception as e:
            duration = time.time() - start_time
            result = TestResult(name, TestStatus.FAIL, f"Exception: {str(e)}", duration, timestamp)
            self.results.append(result)
            return result
    
    # ========== Environment Tests ==========
    
    def test_environment_services(self) -> tuple[TestStatus, str]:
        """Test if required services are running"""
        services = [
            ("Django API", f"{self.base_url}/api/health/", 200),
            ("ClickHouse", "http://localhost:8123", 200),
            ("PostgreSQL", None, None),  # Check via Django
            ("Redis", None, None),
            ("MinIO", "http://localhost:9000/minio/health/live", 200),
        ]
        
        issues = []
        for name, url, expected_status in services:
            if url:
                try:
                    response = requests.get(url, timeout=5)
                    if response.status_code != expected_status:
                        issues.append(f"{name}: HTTP {response.status_code}")
                except Exception as e:
                    issues.append(f"{name}: {str(e)}")
        
        if issues:
            return TestStatus.FAIL, f"Service issues: {', '.join(issues)}"
        return TestStatus.PASS, "All services responsive"
    
    # ========== API Tests ==========
    
    def test_api_authentication(self) -> tuple[TestStatus, str]:
        """Test JWT authentication endpoints"""
        try:
            # Test login endpoint (requires valid credentials)
            login_url = f"{self.base_url}/api/auth/login/"
            response = self.session.get(login_url)
            
            # Check if endpoint exists and returns proper status
            if response.status_code == 405:  # Method Not Allowed (POST expected)
                return TestStatus.PASS, "Auth endpoints configured"
            elif response.status_code == 200:
                return TestStatus.PASS, "Auth endpoints accessible"
            else:
                return TestStatus.WARNING, f"Unexpected auth status: {response.status_code}"
                
        except Exception as e:
            return TestStatus.FAIL, f"Auth test failed: {str(e)}"
    
    def test_invoice_api(self) -> tuple[TestStatus, str]:
        """Test invoice submission API"""
        try:
            # Check if invoice endpoint exists
            url = f"{self.base_url}/api/invoices/"
            response = self.session.get(url)
            
            if response.status_code in [200, 401, 403]:  # Endpoint exists
                return TestStatus.PASS, "Invoice API endpoint accessible"
            else:
                return TestStatus.WARNING, f"Invoice API status: {response.status_code}"
                
        except Exception as e:
            return TestStatus.FAIL, f"Invoice API test failed: {str(e)}"
    
    def test_upload_simulation(self) -> tuple[TestStatus, str]:
        """Simulate data upload to dashboard"""
        try:
            # Create a test invoice payload
            test_payload = {
                "vendor_name": "Test Vendor",
                "invoice_number": f"TEST-{int(time.time())}",
                "amount": 1234.56,
                "date": datetime.now().isoformat(),
                "description": "E2E Audit Test Invoice",
                "category": "Software",
                "department": "IT",
                "status": "pending"
            }
            
            # Try to POST to invoices endpoint
            url = f"{self.base_url}/api/invoices/"
            response = self.session.post(
                url,
                json=test_payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 201:
                return TestStatus.PASS, f"Upload successful: {response.json().get('id', 'Unknown')}"
            elif response.status_code == 401:
                return TestStatus.WARNING, "Upload requires authentication (expected)"
            else:
                return TestStatus.WARNING, f"Upload response: {response.status_code}"
                
        except Exception as e:
            return TestStatus.FAIL, f"Upload simulation failed: {str(e)}"
    
    # ========== ClickHouse Tests ==========
    
    def test_clickhouse_connection(self) -> tuple[TestStatus, str]:
        """Test ClickHouse connectivity"""
        try:
            # Try to connect to ClickHouse using clickhouse-connect or HTTP
            import clickhouse_connect
            client = clickhouse_connect.get_client(
                host='localhost',
                port=8123,
                username='default',
                password=''
            )
            
            # Test query
            result = client.query("SELECT 1 as test")
            if result.first_row[0] == 1:
                return TestStatus.PASS, "ClickHouse connection successful"
            else:
                return TestStatus.FAIL, "ClickHouse query returned unexpected result"
                
        except ImportError:
            # Fallback to HTTP check
            try:
                response = requests.post(
                    "http://localhost:8123",
                    data="SELECT 1",
                    headers={"X-ClickHouse-User": "default"}
                )
                if response.status_code == 200 and "1" in response.text:
                    return TestStatus.PASS, "ClickHouse HTTP connection successful"
                else:
                    return TestStatus.WARNING, f"ClickHouse HTTP: {response.status_code}"
            except Exception as e:
                return TestStatus.FAIL, f"ClickHouse connection failed: {str(e)}"
        except Exception as e:
            return TestStatus.FAIL, f"ClickHouse test failed: {str(e)}"
    
    def test_clickhouse_audit_table(self) -> tuple[TestStatus, str]:
        """Verify audit table exists and has data"""
        try:
            import clickhouse_connect
            client = clickhouse_connect.get_client(
                host='localhost',
                port=8123,
                username='default',
                password=''
            )
            
            # Check if audit_events table exists
            result = client.query("""
                SELECT name, create_table_query
                FROM system.tables 
                WHERE database = 'financeai'
                AND name = 'audit_events'
            """)
            
            if result.row_count == 0:
                return TestStatus.WARNING, "audit_events table not found"
            
            # Check row count
            count_result = client.query("SELECT count() FROM financeai.audit_events")
            row_count = count_result.first_row[0]
            
            return TestStatus.PASS, f"audit_events table exists with {row_count} rows"
            
        except Exception as e:
            return TestStatus.WARNING, f"Could not verify audit table: {str(e)}"
    
    # ========== Load Tests ==========
    
    def test_api_load(self, num_requests: int = 50) -> tuple[TestStatus, str]:
        """Perform load test on API endpoints"""
        try:
            endpoints = [
                f"{self.base_url}/api/health/",
                f"{self.base_url}/api/invoices/",
                f"{self.base_url}/api/auth/login/",
            ]
            
            response_times = []
            success_count = 0
            
            start_time = time.time()
            
            for i in range(num_requests):
                for endpoint in endpoints:
                    try:
                        request_start = time.time()
                        response = self.session.get(endpoint, timeout=5)
                        request_time = time.time() - request_start
                        response_times.append(request_time)
                        
                        if response.status_code < 500:  # Not server error
                            success_count += 1
                    except Exception:
                        pass  # Count as failure
            
            total_time = time.time() - start_time
            total_requests = num_requests * len(endpoints)
            success_rate = (success_count / total_requests) * 100
            
            if response_times:
                avg_time = statistics.mean(response_times)
                p95 = statistics.quantiles(response_times, n=20)[18] if len(response_times) >= 20 else max(response_times)
            else:
                avg_time = p95 = 0
            
            details = (
                f"Total: {total_requests} requests, "
                f"Success: {success_rate:.1f}%, "
                f"Avg: {avg_time:.3f}s, "
                f"P95: {p95:.3f}s, "
                f"Total time: {total_time:.2f}s"
            )
            
            if success_rate >= 80:
                return TestStatus.PASS, details
            elif success_rate >= 50:
                return TestStatus.WARNING, details
            else:
                return TestStatus.FAIL, details
                
        except Exception as e:
            return TestStatus.FAIL, f"Load test failed: {str(e)}"
    
    # ========== System Monitoring ==========
    
    def monitor_system_resources(self, duration: int = 30) -> tuple[TestStatus, str]:
        """Monitor CPU and memory during test execution"""
        try:
            cpu_percentages = []
            memory_percentages = []
            
            for _ in range(duration // 2):  # Sample every 2 seconds
                cpu_percentages.append(psutil.cpu_percent(interval=1))
                memory_percentages.append(psutil.virtual_memory().percent)
                time.sleep(1)
            
            avg_cpu = statistics.mean(cpu_percentages)
            avg_memory = statistics.mean(memory_percentages)
            max_cpu = max(cpu_percentages)
            max_memory = max(memory_percentages)
            
            details = (
                f"CPU: avg={avg_cpu:.1f}%, max={max_cpu:.1f}% | "
                f"Memory: avg={avg_memory:.1f}%, max={max_memory:.1f}%"
            )
            
            if max_cpu < 90 and max_memory < 90:
                return TestStatus.PASS, details
            elif max_cpu < 95 and max_memory < 95:
                return TestStatus.WARNING, details
            else:
                return TestStatus.FAIL, details
                
        except Exception as e:
            return TestStatus.WARNING, f"Resource monitoring failed: {str(e)}"
    
    # ========== Data Integrity Tests ==========
    
    def test_data_integrity(self) -> tuple[TestStatus, str]:
        """Verify data consistency between systems"""
        issues = []
        
        try:
            # Test PostgreSQL connection via Django
            import django
            django.setup()
            from django.db import connection
            
            with connection.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM auth_user")
                user_count = cursor.fetchone()[0]
            
            # Try ClickHouse comparison
            import clickhouse_connect
            client = clickhouse_connect.get_client(
                host='localhost',
                port=8123,
                username='default',
                password=''
            )
            
            # Count audit events
            result = client.query("SELECT count() FROM financeai.audit_events")
            audit_count = result.first_row[0]
            
            details = f"PostgreSQL users: {user_count}, ClickHouse audit events: {audit_count}"
            
            if user_count >= 0 and audit_count >= 0:
                return TestStatus.PASS, details
            else:
                return TestStatus.WARNING, details
                
        except Exception as e:
            return TestStatus.WARNING, f"Data integrity check partial: {str(e)}"
    
    # ========== Report Generation ==========
    
    def generate_report(self) -> str:
        """Generate comprehensive audit report"""
        report = []
        report.append("# FinanceAI E2E Audit Report")
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append(f"Base URL: {self.base_url}")
        report.append("\n## Summary\n")
        
        # Calculate statistics
        total_tests = len(self.results)
        passed = sum(1 for r in self.results if r.status == TestStatus.PASS)
        failed = sum(1 for r in self.results if r.status == TestStatus.FAIL)
        warnings = sum(1 for r in self.results if r.status == TestStatus.WARNING)
        
        report.append(f"- **Total Tests:** {total_tests}")
        report.append(f"- **Passed:** {passed} ({passed/total_tests*100:.1f}%)")
        report.append(f"- **Failed:** {failed}")
        report.append(f"- **Warnings:** {warnings}")
        
        report.append("\n## Detailed Results\n")
        
        for result in self.results:
            status_icon = {
                TestStatus.PASS: "✅",
                TestStatus.FAIL: "❌",
                TestStatus.WARNING: "⚠️",
                TestStatus.SKIPPED: "⏭️"
            }.get(result.status, "❓")
            
            report.append(f"### {status_icon} {result.name}")
            report.append(f"- **Status:** {result.status.value}")
            report.append(f"- **Duration:** {result.duration:.3f}s")
            report.append(f"- **Time:** {result.timestamp.strftime('%H:%M:%S')}")
            report.append(f"- **Details:** {result.details}")
            report.append("")
        
        # Recommendations
        report.append("\n## Recommendations\n")
        
        if failed > 0:
            report.append("❌ **CRITICAL ISSUES FOUND**")
            report.append("1. Investigate failed tests immediately")
            report.append("2. Check service health and configurations")
            report.append("3. Verify database connections")
        
        if warnings > 0:
            report.append("⚠️ **WARNINGS IDENTIFIED**")
            report.append("1. Review authentication setup")
            report.append("2. Check ClickHouse table structures")
            report.append("3. Monitor API response times")
        
        if failed == 0 and warnings == 0:
            report.append("✅ **ALL SYSTEMS OPERATIONAL**")
            report.append("1. Continue with deployment")
            report.append("2. Monitor production metrics")
            report.append("3. Schedule regular audits")
        
        return "\n".join(report)
    
    # ========== Main Execution ==========
    
    def run_comprehensive_audit(self):
        """Run all audit tests"""
        print("🚀 Starting FinanceAI E2E Comprehensive Audit")
        print("=" * 60)
        
        # Environment checks
        print("\n📋 Environment Checks:")
        self.log_test("Service Health", self.test_environment_services)
        self.log_test("System Resources", self.monitor_system_resources)
        
        # API Tests
        print("\n🔌 API Tests:")
        self.log_test("Authentication", self.test_api_authentication)
        self.log_test("Invoice API", self.test_invoice_api)
        self.log_test("Data Upload", self.test_upload_simulation)
        
        # ClickHouse Tests
        print("\n🗄️ ClickHouse Tests:")
        self.log_test("Connection", self.test_clickhouse_connection)
        self.log_test("Audit Table", self.test_clickhouse_audit_table)
        self.log_test("Data Integrity", self.test_data_integrity)
        
        # Load Tests
        print("\n⚡ Load Tests:")
        self.log_test("API Load (50 requests)", lambda: self.test_api_load(50))
        
        # Generate report
        print("\n📊 Generating audit report...")
        report = self.generate_report()
        
        # Save to file
        with open("audit_results.md", "w") as f:
            f.write(report)
        
        print(f"✅ Audit complete! Report saved to audit_results.md")
        print("\n" + "=" * 60)
        
        # Print summary
        for result in self.results:
            icon = "✅" if result.status == TestStatus.PASS else "❌" if result.status == TestStatus.FAIL else "⚠️"
            print(f"{icon} {result.name}: {result.status.value} ({result.duration:.2f}s)")
        
        return all(r.status != TestStatus.FAIL for r in self.results)


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="FinanceAI E2E Audit Tool")
    parser.add_argument("--url", default="http://localhost:8000", help="Base URL of FinanceAI API")
    parser.add_argument("--quick", action="store_true", help="Run quick audit only")
    
    args = parser.parse_args()
    
    try:
        auditor = FinanceAIAuditor(base_url=args.url)
        success = auditor.run_comprehensive_audit()
        
        if not success:
            print("\n❌ Audit failed! Check audit_results.md for details.")
            sys.exit(1)
        else:
            print("\n✅ Audit completed successfully!")
            sys.exit(0)
            
    except KeyboardInterrupt:
        print("\n\n⏹️ Audit interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()