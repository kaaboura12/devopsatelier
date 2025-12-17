# Prometheus & Grafana Monitoring Setup

Ce document décrit l'intégration de Prometheus et Grafana pour surveiller votre infrastructure DevOps.

## 📋 Vue d'ensemble

Cette configuration permet de monitorer :
- **Spring Boot Application** : Métriques via Spring Actuator
- **Jenkins** : Métriques via le plugin Prometheus Metrics
- **Ubuntu Machine** : Métriques système via Node Exporter
- **Kubernetes** : Métriques du cluster

## 🚀 Déploiement

### 1. Configuration Spring Boot

Les dépendances Actuator ont été ajoutées au `pom.xml` :
- `spring-boot-starter-actuator`
- `micrometer-registry-prometheus`

L'application expose les métriques sur : `http://spring-service:8080/actuator/prometheus`

### 2. Configuration Jenkins

Le plugin "Prometheus Metrics Plugin" doit être installé sur Jenkins.

Les métriques sont exposées sur : `http://jenkins-host:8080/prometheus`

**Important** : Puisque Jenkins est sur la même machine que Kubernetes :
- Le pipeline Jenkins crée automatiquement un Service Kubernetes qui pointe vers l'IP du node
- Prometheus découvre automatiquement Jenkins via la découverte Kubernetes
- **Assurez-vous que Jenkins écoute sur toutes les interfaces** (0.0.0.0:8080) et non uniquement sur localhost
  - Vérifiez la configuration Jenkins : `JENKINS_LISTEN_ADDRESS=0.0.0.0` ou `--httpListenAddress=0.0.0.0`

### 3. Déploiement sur Kubernetes

Le pipeline Jenkins déploie automatiquement :
- Prometheus (port 30090)
- Grafana (port 30300)
- Node Exporter (DaemonSet)

Ou manuellement :
```bash
kubectl apply -f prometheus-deployment.yaml -n devops
kubectl apply -f grafana-deployment.yaml -n devops
kubectl apply -f node-exporter-deployment.yaml -n devops
```

## 🔧 Configuration

### Accès aux interfaces

- **Prometheus** : `http://<node-ip>:30090`
- **Grafana** : `http://<node-ip>:30300`
  - Username: `admin`
  - Password: `admin123`

### Configuration Prometheus

Le fichier `prometheus-deployment.yaml` contient la configuration de scraping pour :
- Spring Boot (découverte automatique via Kubernetes)
- Jenkins (configuration statique - à mettre à jour)
- Node Exporter (découverte automatique)
- Kubernetes API Server
- Kubernetes Nodes
- Kubernetes Pods avec annotations

### Dashboard Grafana

Un dashboard pré-configuré est automatiquement provisionné avec :
- Taux de requêtes HTTP Spring Boot
- Utilisation mémoire JVM
- Durée des builds Jenkins
- Utilisation CPU/Mémoire du système
- Statut des pods Kubernetes
- Taux d'erreurs

## 📊 Métriques collectées

### Spring Boot
- `http_server_requests_seconds_count` : Nombre de requêtes HTTP
- `jvm_memory_used_bytes` : Utilisation mémoire JVM
- `jvm_gc_pause_seconds` : Pauses du garbage collector
- `process_cpu_usage` : Utilisation CPU

### Jenkins
- `jenkins_builds_duration_milliseconds` : Durée des builds
- `jenkins_builds_total` : Nombre total de builds
- `jenkins_job_status` : Statut des jobs

### Node Exporter
- `node_cpu_seconds_total` : Utilisation CPU
- `node_memory_MemTotal_bytes` : Mémoire totale
- `node_filesystem_size_bytes` : Taille des systèmes de fichiers
- `node_network_receive_bytes_total` : Réseau entrant

## 🔍 Vérification

### Vérifier que Prometheus scrape correctement

1. Accédez à Prometheus : `http://<node-ip>:30090`
2. Allez dans Status → Targets
3. Vérifiez que tous les targets sont "UP"

### Vérifier les métriques Spring Boot

```bash
# Depuis un pod dans le cluster
curl http://spring-service:8080/actuator/prometheus
```

### Vérifier les métriques Jenkins

```bash
# Depuis la machine Jenkins ou un pod avec accès réseau
curl http://<jenkins-ip>:8080/prometheus
```

## 🛠️ Dépannage

### Prometheus ne peut pas scraper Spring Boot

1. Vérifiez que les annotations sont présentes dans `spring-deployement.yaml`
2. Vérifiez que l'application expose `/actuator/prometheus`
3. Vérifiez les logs Prometheus : `kubectl logs -n devops -l app=prometheus`

### Grafana ne peut pas se connecter à Prometheus

1. Vérifiez que le service Prometheus est accessible : `kubectl get svc -n devops prometheus-service`
2. Vérifiez la configuration dans Grafana : Configuration → Data Sources

### Node Exporter ne collecte pas de métriques

1. Vérifiez que le DaemonSet est déployé : `kubectl get daemonset -n devops`
2. Vérifiez les logs : `kubectl logs -n devops -l app=node-exporter`

## 📝 Notes importantes

1. **Jenkins** : Si Jenkins est sur une machine externe, assurez-vous que Prometheus peut y accéder (firewall, réseau)
2. **Sécurité** : Changez le mot de passe Grafana par défaut en production
3. **Rétention** : La rétention Prometheus est configurée à 200h (8 jours). Ajustez selon vos besoins
4. **Ressources** : Les limites de ressources sont définies dans les deployments. Ajustez selon votre cluster

## 🔄 Mise à jour de la configuration

Pour mettre à jour la configuration Prometheus :

```bash
# Éditez le ConfigMap
kubectl edit configmap prometheus-config -n devops

# Rechargez la configuration Prometheus
curl -X POST http://<prometheus-ip>:30090/-/reload
```

Ou redéployez :
```bash
kubectl delete -f prometheus-deployment.yaml -n devops
kubectl apply -f prometheus-deployment.yaml -n devops
```

