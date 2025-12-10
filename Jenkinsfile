pipeline {
    agent any

    environment {
        IMAGE_NAME = "kaaboura20/devopsatelier"
        DOCKER_CREDENTIALS = credentials('dockerhub-creds')
        KUBE_NAMESPACE = "devops"
        KUBECONFIG = "${WORKSPACE}/.kube/config"
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
            """
        }
    }
}
