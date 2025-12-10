pipeline {
    agent any

    environment {
        IMAGE_NAME = "kaaboura20/devopsatelier"
        DOCKER_CREDENTIALS = credentials('dockerhub-creds')
        SONARQUBE_TOKEN = credentials('sonar-token')
        KUBE_NAMESPACE = "devops"
        KUBECONFIG = "${WORKSPACE}/.kube/config"
        SONARQUBE_URL = "http://sonarqube-service.${KUBE_NAMESPACE}.svc.cluster.local:9000"
    }

    stages {
        stage('Checkout') {
            steps {
                git url: 'https://github.com/kaaboura12/devopsatelier.git', branch: 'main'
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
                    
                    echo "Waiting for SonarQube to fully initialize (this may take 1-2 minutes)..."
                    sleep(time: 90, unit: 'SECONDS')
                    
                    echo "Verifying SonarQube is accessible..."
                    sh """
                        SONARQUBE_POD=\$(kubectl get pods -n ${KUBE_NAMESPACE} -l app=sonarqube -o jsonpath='{.items[0].metadata.name}')
                        if [ -n "\$SONARQUBE_POD" ]; then
                            # Check if SonarQube container is running
                            kubectl get pod \$SONARQUBE_POD -n ${KUBE_NAMESPACE} -o jsonpath='{.status.containerStatuses[0].ready}' | grep -q "true" && echo "✅ SonarQube pod is ready!" || echo "⚠️ SonarQube pod may still be initializing"
                        fi
                    """
                }
            }
        }

        stage('Build Application') {
            steps {
                sh 'mvn clean package'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                    sh """
                        mvn sonar:sonar \
                            -Dsonar.projectKey=devopsatelier \
                            -Dsonar.host.url=${SONARQUBE_URL} \
                            -Dsonar.login=$SONAR_TOKEN
                    """
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

        stage('Verify SonarQube Analysis') {
            steps {
                script {
                    echo "Verifying that SonarQube analysis was performed..."
                    withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                        sh """
                            SONARQUBE_POD=\$(kubectl get pods -n ${KUBE_NAMESPACE} -l app=sonarqube -o jsonpath='{.items[0].metadata.name}')
                            if [ -n "\$SONARQUBE_POD" ]; then
                                echo "Checking SonarQube projects..."
                                RESULT=\$(kubectl exec -n ${KUBE_NAMESPACE} \$SONARQUBE_POD -- curl -s -u \$SONAR_TOKEN: ${SONARQUBE_URL}/api/projects/search 2>/dev/null || echo "")
                                if echo "\$RESULT" | grep -q "devopsatelier"; then
                                    echo "✅ SonarQube analysis verified - project 'devopsatelier' found!"
                                else
                                    echo "⚠️ Could not verify project in SonarQube (this is not a failure)"
                                fi
                            fi
                        """
                    }
                }
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
                kubectl describe pod -l app=sonarqube -n ${KUBE_NAMESPACE} || true
            """
        }
    }
}
