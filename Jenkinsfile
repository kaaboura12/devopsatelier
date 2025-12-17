pipeline {
    agent any

    environment {
        IMAGE_NAME = "kaaboura20/devopsatelier"
        DOCKER_CREDENTIALS = credentials('dockerhub-creds')
        KUBE_NAMESPACE = "devops"
        KUBECONFIG = "${WORKSPACE}/.kube/config"
        SONARQUBE_TOKEN = credentials('sonar-token')
        SONARQUBE_URL = "http://localhost:9000"
    }

    stages {
        stage('Checkout') {
            steps {
                git url: 'https://github.com/kaaboura12/devopsatelier.git', branch: 'main'
            }
        }

        stage('Build Application') {
            steps {
                sh 'mvn clean package -DskipTests=true'
            }
        }

        stage('Docker Build & Push') {
            steps {
                script {
                    def imageTag = "v${env.BUILD_NUMBER}"
                    sh "docker build -t ${IMAGE_NAME}:${imageTag} ."
                    sh "echo ${DOCKER_CREDENTIALS_PSW} | docker login -u ${DOCKER_CREDENTIALS_USR} --password-stdin"
                    sh "docker push ${IMAGE_NAME}:${imageTag}"
                }
            }
        }

        stage('Setup Kubeconfig for Jenkins') {
            steps {
                sh '''
                    # Create the target directory
                    mkdir -p $WORKSPACE/.kube
                    
                    # Copy the newly generated, self-contained configuration file
                    cp /home/kaaboura12/.kube/portable_config $WORKSPACE/.kube/config
                    
                    # Set secure permissions on the copied file
                    chmod 600 $WORKSPACE/.kube/config
                '''
            }
        }

        stage('Verify Kubernetes Connectivity') {
            steps {
                sh 'kubectl get nodes'
            }
        }

        stage('Deploy SonarQube to Kubernetes') {
            steps {
                sh """
                    kubectl apply --validate=false -f sonarqube-deployement.yaml -n ${KUBE_NAMESPACE}
                """
            }
        }

        stage('Wait for SonarQube to be Ready') {
            steps {
                script {
                    echo "Waiting for SonarQube pod to be ready..."
                    sh """
                        kubectl wait --for=condition=ready pod -l app=sonarqube -n ${KUBE_NAMESPACE} --timeout=300s || true
                    """
                    
                    echo "Waiting additional time for SonarQube to fully initialize..."
                    sleep(time: 30, unit: 'SECONDS')
                    
                    echo "Setting up port-forward to check SonarQube status..."
                    sh """
                        kubectl port-forward -n ${KUBE_NAMESPACE} svc/sonarqube-service 9000:9000 > /tmp/sonar-check.log 2>&1 &
                        echo \$! > /tmp/sonar-check.pid
                        sleep 5
                    """
                    
                    echo "Waiting for SonarQube service to be UP..."
                    sh """
                        until curl -s http://localhost:9000/api/system/status | grep -q "UP"; do
                            echo "SonarQube not ready yet. Sleeping 5s..."
                            sleep 5
                        done
                        echo "SonarQube is ready!"
                    """
                    
                    // Clean up port-forward
                    sh """
                        if [ -f /tmp/sonar-check.pid ]; then
                            kill \$(cat /tmp/sonar-check.pid) 2>/dev/null || true
                            rm -f /tmp/sonar-check.pid
                        fi
                    """
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                script {
                    withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                        // Start port-forward in background
                        sh """
                            kubectl port-forward -n ${KUBE_NAMESPACE} svc/sonarqube-service 9000:9000 > /tmp/sonar-port-forward.log 2>&1 &
                            echo \$! > /tmp/sonar-port-forward.pid
                            sleep 5
                        """
                        
                        try {
                            // Wait until SonarQube is accessible via port-forward
                            sh """
                                until curl -s http://localhost:9000/api/system/status | grep -q "UP"; do
                                    echo "SonarQube not ready yet. Sleeping 5s..."
                                    sleep 5
                                done
                                echo "SonarQube is ready!"
                            """
                            
                            // Run SonarQube analysis
                            sh """
                                mvn sonar:sonar \\
                                    -Dsonar.projectKey=devopsatelier \\
                                    -Dsonar.host.url=http://localhost:9000 \\
                                    -Dsonar.login=$SONAR_TOKEN
                            """
                        } finally {
                            // Kill port-forward
                            sh """
                                if [ -f /tmp/sonar-port-forward.pid ]; then
                                    kill \$(cat /tmp/sonar-port-forward.pid) 2>/dev/null || true
                                    rm -f /tmp/sonar-port-forward.pid
                                fi
                            """
                        }
                    }
                }
            }
        }

        stage('Check Code Coverage') {
            steps {
                script {
                    def jacocoFile = 'target/site/jacoco/jacoco.xml'
                    if (fileExists(jacocoFile)) {
                        echo "✅ JaCoCo report exists"
                        def coverage = sh(
                            script: "grep -o 'covered=\"[0-9]*\"' ${jacocoFile} | head -1 | grep -o '[0-9]*'",
                            returnStdout: true
                        ).trim() as Integer
                        if (coverage == 0) {
                            error "❌ Code coverage is ZERO!"
                        } else {
                            echo "✅ Code coverage > 0 → OK"
                        }
                    } else {
                        echo "⚠️ JaCoCo report not found, skipping coverage check"
                    }
                }
            }
        }

        stage('Deploy MySQL to Kubernetes') {
            steps {
                sh """
                    kubectl apply --validate=false -f mysql-deployement.yaml -n ${KUBE_NAMESPACE}
                """
            }
        }

        stage('Wait for MySQL to be Ready') {
            steps {
                script {
                    echo "Waiting for MySQL pod to be ready..."
                    sh """
                        kubectl wait --for=condition=ready pod -l app=mysql -n ${KUBE_NAMESPACE} --timeout=300s || true
                    """
                    
                    echo "Waiting additional time for MySQL to fully initialize..."
                    sleep(time: 30, unit: 'SECONDS')
                    
                    echo "Ensuring MySQL privileges are granted..."
                    sh """
                        MYSQL_POD=\$(kubectl get pods -n ${KUBE_NAMESPACE} -l app=mysql -o jsonpath='{.items[0].metadata.name}')
                        if [ -n "\$MYSQL_POD" ]; then
                            kubectl exec -n ${KUBE_NAMESPACE} \$MYSQL_POD -- mysql -uroot -proot123 -e "CREATE USER IF NOT EXISTS 'spring'@'%' IDENTIFIED BY 'spring123'; GRANT ALL PRIVILEGES ON springdb.* TO 'spring'@'%'; FLUSH PRIVILEGES;" || echo "Privileges may already be set"
                        fi
                    """
                }
            }
        }

        stage('Update Spring Deployment Image') {
            steps {
                script {
                    def imageTag = "v${env.BUILD_NUMBER}"
                    sh """
                        # Update the image tag in spring-deployement.yaml
                        sed -i 's|image: ${IMAGE_NAME}:.*|image: ${IMAGE_NAME}:${imageTag}|g' spring-deployement.yaml
                    """
                }
            }
        }

        stage('Deploy Spring Boot to Kubernetes') {
            steps {
                sh """
                    kubectl apply --validate=false -f spring-deployement.yaml -n ${KUBE_NAMESPACE}
                """
            }
        }

        stage('Deploy Prometheus and Grafana') {
            steps {
                script {
                    // Get the Kubernetes node IP to configure Jenkins endpoint
                    def nodeIP = sh(
                        script: "kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type==\"InternalIP\")].address}'",
                        returnStdout: true
                    ).trim()
                    
                    echo "Kubernetes Node IP: ${nodeIP}"
                    
                    // Update jenkins-service.yaml with the actual node IP
                    sh """
                        # Create jenkins-service.yaml with node IP
                        cat > jenkins-service.yaml <<EOF
apiVersion: v1
kind: Service
metadata:
  name: jenkins-service
  namespace: ${KUBE_NAMESPACE}
  labels:
    app: jenkins
spec:
  type: ClusterIP
  ports:
    - port: 8080
      targetPort: 8080
      protocol: TCP
      name: http

---
apiVersion: v1
kind: Endpoints
metadata:
  name: jenkins-service
  namespace: ${KUBE_NAMESPACE}
subsets:
  - addresses:
      - ip: "${nodeIP}"
    ports:
      - port: 8080
        name: http
EOF
                    """
                    
                    sh """
                        echo "Deploying Jenkins Service..."
                        kubectl apply -f jenkins-service.yaml -n ${KUBE_NAMESPACE}
                        
                        echo "Deploying Prometheus..."
                        kubectl apply -f prometheus-deployment.yaml -n ${KUBE_NAMESPACE}
                        
                        echo "Deploying Grafana..."
                        kubectl apply -f grafana-deployment.yaml -n ${KUBE_NAMESPACE}
                        
                        echo "Deploying Node Exporter..."
                        kubectl apply -f node-exporter-deployment.yaml -n ${KUBE_NAMESPACE}
                        
                        echo "Waiting for monitoring stack to be ready..."
                        kubectl wait --for=condition=ready pod -l app=prometheus -n ${KUBE_NAMESPACE} --timeout=300s || true
                        kubectl wait --for=condition=ready pod -l app=grafana -n ${KUBE_NAMESPACE} --timeout=300s || true
                    """
                }
            }
        }

        stage('Wait for Spring Boot to be Ready') {
            steps {
                script {
                    echo "Waiting for Spring Boot pods to be ready..."
                    sh """
                        kubectl wait --for=condition=ready pod -l app=spring-app -n ${KUBE_NAMESPACE} --timeout=300s || true
                    """
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                sh """
                    echo "✅ Pods status:"
                    kubectl get pods -n ${KUBE_NAMESPACE}
                    
                    echo ""
                    echo "✅ Services status:"
                    kubectl get svc -n ${KUBE_NAMESPACE}
                    
                    echo ""
                    echo "✅ Checking Spring Boot logs for connection status:"
                    kubectl logs -n ${KUBE_NAMESPACE} -l app=spring-app --tail=20 || true
                """
            }
        }
    }

    post {
        success {
            echo "🎉 Build, Docker push, and Kubernetes deployment completed successfully!"
        }
        failure {
            echo "❌ Pipeline FAILED!"
            sh """
                echo "📋 Debugging information:"
                kubectl get pods -n ${KUBE_NAMESPACE}
                kubectl describe pod -l app=mysql -n ${KUBE_NAMESPACE} || true
                kubectl describe pod -l app=spring-app -n ${KUBE_NAMESPACE} || true
            """
        }
    }
}
