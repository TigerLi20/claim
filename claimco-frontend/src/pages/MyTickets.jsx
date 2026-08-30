import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import Ticket from "../components/Ticket";
import Service from "../components/Service";
import PurchasedService from "../components/PurchasedService";
import ServiceInstance from "../components/ServiceInstance";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAuth } from "../context/AuthContext";

export default function MyTickets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [services, setServices] = useState([]);
  const [purchasedServices, setPurchasedServices] = useState([]);
  const [serviceInstances, setServiceInstances] = useState([]);
  const [serviceView, setServiceView] = useState("offered");
  const [view, setView] = useState("posted");
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [serviceStatusFilter, setServiceStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [taskData, serviceData, purchasedData, instanceData] = await Promise.all([api.myTasks(), api.myServices(), api.purchasedServices(), api.serviceInstances()]);
      setTasks(taskData);
      setServices(serviceData);
      setPurchasedServices(purchasedData);
      setServiceInstances(instanceData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const postedTasks = tasks.filter((task) => task.requester.id === user.id);
  const claimedTasks = tasks.filter((task) => task.worker && task.worker.id === user.id);
  const offeredServices = [...services].sort((first, second) => Number(second.status === "active") - Number(first.status === "active"));
  const visibleTasks = view === "posted" ? postedTasks : claimedTasks;

  const taskStatusOptions = view === "posted"
    ? ["all", "open", "claimed", "fulfilled", "cancelled"]
    : ["all", "claimed", "fulfilled"];

  const serviceStatusOptions = serviceView === "completed" || serviceView === "purchased"
    ? ["all", "claimed", "fulfilled"]
    : [];

  function matchesTaskStatusFilter(task) {
    if (taskStatusFilter === "all") return true;
    if (taskStatusFilter === "open") return task.status === "open";
    if (taskStatusFilter === "claimed") return task.status === "claimed";
    if (taskStatusFilter === "fulfilled") return task.status === "done";
    if (taskStatusFilter === "cancelled") return task.status === "cancelled";
    return true;
  }

  function matchesServiceStatusFilter(item) {
    if (serviceStatusFilter === "all") return true;
    if (serviceView === "completed") {
      const isFulfilled = item.status === "fulfilled" || (item.providerCompleted && item.buyerCompleted);
      if (serviceStatusFilter === "claimed") return !isFulfilled && item.status === "claimed";
      if (serviceStatusFilter === "fulfilled") return isFulfilled;
      return true;
    }
    if (serviceView === "purchased") {
      const isFulfilled = !!(item.providerCompleted && item.buyerCompleted);
      if (serviceStatusFilter === "claimed") return !isFulfilled && item.confirmationStatus === "confirmed";
      if (serviceStatusFilter === "fulfilled") return isFulfilled;
      return true;
    }
    return true;
  }

  const filteredVisibleTasks = visibleTasks.filter(matchesTaskStatusFilter);
  const currentServiceTabItems = serviceView === "offered" ? offeredServices : serviceView === "completed" ? serviceInstances : purchasedServices;
  const filteredServiceTabItems = currentServiceTabItems.filter(matchesServiceStatusFilter);

  function renderStatusFilter(value, onChange, options, idSuffix) {
    return (
      <div className="list-filter-bar">
        <label htmlFor={`status-filter-${idSuffix}`}>Filter</label>
        <select id={`status-filter-${idSuffix}`} value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "All" : option.charAt(0).toUpperCase() + option.slice(1)}
            </option>
          ))}
        </select>
      </div>
    );
  }

  async function submitServiceChange(id, action) {
    setBusyId(id);
    setError("");
    try {
      await action(id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleServiceChange(id, action) {
    if (action === api.deactivateService) {
      setConfirmation({
        message: "Pause this tutoring offer? Any pending claim requests will be automatically declined.",
        onConfirm: () => submitServiceChange(id, action),
      });
      return;
    }
    await submitServiceChange(id, action);
  }

  async function handleServiceUpdate(id, payload) {
    setBusyId(id);
    setError("");
    try {
      await api.updateService(id, payload);
      await load();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setBusyId(null);
    }
  }

  async function handleServiceReoffer(id, payload) {
    setBusyId(id);
    setError("");
    try {
      await api.reofferService(id, payload);
      await load();
      navigate("/services");
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setBusyId(null);
    }
  }

  async function handleServiceInstanceComplete(id) {
    setBusyId(id);
    setError("");
    try {
      await api.completeServiceInstance(id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleComplete(id) {
    setBusyId(id);
    setError("");
    try {
      await api.completeTask(id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function submitCancel(id) {
    setBusyId(id);
    setError("");
    try {
      await api.cancelTask(id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(id) {
    setConfirmation({
      message: "Cancel this ticket? Any pending claim requests will be automatically declined.",
      onConfirm: () => submitCancel(id),
    });
  }

  async function handleUpdate(id, payload) {
    setBusyId(id);
    setError("");
    try {
      await api.updateTask(id, payload);
      await load();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setBusyId(null);
    }
  }

  async function handleReoffer(id, payload) {
    setBusyId(id);
    setError("");
    try {
      await api.reofferTask(id, payload);
      await load();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="content">
      {confirmation && (
        <ConfirmDialog
          message={confirmation.message}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => { setConfirmation(null); confirmation.onConfirm(); }}
        />
      )}
      {error && <div className="banner banner-error">{error}</div>}
      {loading ? (
        <div className="loading-note">Loading your tickets…</div>
      ) : tasks.length === 0 && services.length === 0 && purchasedServices.length === 0 && serviceInstances.length === 0 ? (
        <div className="empty-note">Nothing here yet — post a ticket or claim one from the board.</div>
      ) : (
        <>
          <div className="subtabs" role="tablist" aria-label="My tickets views">
            <button
              className={view === "posted" ? "active" : ""}
              onClick={() => {
                setView("posted");
                setTaskStatusFilter("all");
              }}
              role="tab"
              aria-selected={view === "posted"}
            >
              Posted by me <span>{postedTasks.length}</span>
            </button>
            <button
              className={view === "claimed" ? "active" : ""}
              onClick={() => {
                setView("claimed");
                setTaskStatusFilter("all");
              }}
              role="tab"
              aria-selected={view === "claimed"}
            >
              Claimed by me <span>{claimedTasks.length}</span>
            </button>
            <button
              className={view === "services" ? "active" : ""}
              onClick={() => {
                setView("services");
                setServiceStatusFilter("all");
              }}
              role="tab"
              aria-selected={view === "services"}
            >
              Tutoring
            </button>
          </div>
          {view === "services" ? (
            <>
              <div className="subtabs service-subtabs" role="tablist" aria-label="My tutoring views">
                <button className={serviceView === "offered" ? "active" : ""} onClick={() => {
                  setServiceView("offered");
                  setServiceStatusFilter("all");
                }} role="tab" aria-selected={serviceView === "offered"}>Tutoring I offer <span>{services.length}</span></button>
                <button className={serviceView === "completed" ? "active" : ""} onClick={() => {
                  setServiceView("completed");
                  setServiceStatusFilter("all");
                }} role="tab" aria-selected={serviceView === "completed"}>Tutoring I'm completing <span>{serviceInstances.length}</span></button>
                <span className="service-subtabs-divider" aria-hidden="true" />
                <button className={serviceView === "purchased" ? "active" : ""} onClick={() => {
                  setServiceView("purchased");
                  setServiceStatusFilter("all");
                }} role="tab" aria-selected={serviceView === "purchased"}>Tutoring purchased <span>{purchasedServices.length}</span></button>
              </div>
              {serviceView === "offered" ? (
                services.length === 0 ? <div className="empty-note">You have not offered any tutoring yet.</div> : <div className="service-grid">{offeredServices.map((service) => <Service key={service.id} service={service} onUpdate={handleServiceUpdate} onReoffer={handleServiceReoffer} onActivate={(id) => handleServiceChange(id, api.activateService)} onDeactivate={(id) => handleServiceChange(id, api.deactivateService)} busy={busyId === service.id} />)}</div>
              ) : serviceView === "completed" ? (
                <>
                  {serviceInstances.length > 0 && renderStatusFilter(serviceStatusFilter, setServiceStatusFilter, serviceStatusOptions, "completing")}
                  {filteredServiceTabItems.length === 0 ? (
                    <div className="empty-note">No matching tutoring sessions.</div>
                  ) : (
                    <div className="service-grid">{filteredServiceTabItems.map((instance) => <ServiceInstance key={instance.id} instance={instance} currentUserId={user.id} onComplete={handleServiceInstanceComplete} busy={busyId === instance.id} />)}</div>
                  )}
                </>
              ) : (
                <>
                  {purchasedServices.length > 0 && renderStatusFilter(serviceStatusFilter, setServiceStatusFilter, serviceStatusOptions, "purchased")}
                  {filteredServiceTabItems.length === 0 ? (
                    <div className="empty-note">No matching purchased tutoring.</div>
                  ) : (
                    <div className="service-grid">{filteredServiceTabItems.map((purchase) => <PurchasedService key={purchase.id} purchase={purchase} currentUserId={user.id} onComplete={handleServiceInstanceComplete} busy={busyId === purchase.id} />)}</div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {visibleTasks.length > 0 && renderStatusFilter(taskStatusFilter, setTaskStatusFilter, taskStatusOptions, view)}
              {filteredVisibleTasks.length === 0 ? (
                <div className="empty-note">
                  {view === "posted" ? "You have not posted any matching tickets yet." : "You have not claimed any matching tickets yet."}
                </div>
              ) : (
                <div className="board">
                  {filteredVisibleTasks.map((t) => (
                    <Ticket
                      key={t.id}
                      task={t}
                      currentUserId={user.id}
                      onComplete={handleComplete}
                      onCancel={handleCancel}
                      onUpdate={handleUpdate}
                      onReoffer={handleReoffer}
                      busy={busyId === t.id}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
